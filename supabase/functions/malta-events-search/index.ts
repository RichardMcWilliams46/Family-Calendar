import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
}

interface TavilyResponse {
  results: TavilyResult[];
}

interface DiscoveredEvent {
  title: string;
  description: string;
  event_date: string;
  event_date_parsed: string | null;
  venue: string;
  category: string;
  source_url: string;
  source_title: string;
}

const CATEGORY_QUERIES = [
  { query: "site:whatson.com.mt events 2026", category: "event" },
  { query: "site:showshappening.com Malta events 2026", category: "event" },
  { query: "site:visitmalta.com events things to do 2026", category: "event" },
  { query: "site:lovinmalta.com events things to do 2026", category: "event" },
  { query: "site:ticketline.com.mt concerts shows 2026", category: "concert" },
  { query: "whatson.com.mt Malta concerts theatre festival 2026", category: "concert" },
  { query: "ticketline.com.mt Malta live music theatre 2026", category: "theatre" },
];

function extractDateFromText(text: string): string | null {
  // Try to find date patterns like "12 June 2026", "June 12 2026", "2026-06-12"
  const patterns = [
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(202[5-9])\b/i,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(202[5-9])\b/i,
    /\b(202[5-9])-(\d{2})-(\d{2})\b/,
  ];

  const monthMap: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12",
  };

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        if (pattern.source.startsWith("\\b(202")) {
          // ISO format
          return match[0];
        } else if (pattern.source.startsWith("\\b(\\d")) {
          // "12 June 2026"
          const day = match[1].padStart(2, "0");
          const month = monthMap[match[2].toLowerCase()];
          return `${match[3]}-${month}-${day}`;
        } else {
          // "June 12 2026"
          const month = monthMap[match[1].toLowerCase()];
          const day = match[2].padStart(2, "0");
          return `${match[3]}-${month}-${day}`;
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

function extractVenue(text: string): string {
  const venuePatterns = [
    /(?:at|@)\s+([A-Z][^,.\n]{3,40}(?:Theatre|Hall|Arena|Venue|Club|Bar|Centre|Center|Stadium|Garden|Park|Valletta|Mdina|Sliema|St\.\s+Julian|Bugibba|Marsaxlokk))/i,
    /([A-Z][^,.\n]{3,40}(?:Theatre|Hall|Arena|Venue|Club|Bar|Centre|Center|Stadium))/,
    /(Valletta|Mdina|Sliema|St\.\s+Julian'?s?|Bugibba|Marsaxlokk|Rabat|Birgu|Vittoriosa|Mosta|Naxxar)/i,
  ];
  for (const pattern of venuePatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function parseEventsFromResults(results: TavilyResult[], category: string): DiscoveredEvent[] {
  const events: DiscoveredEvent[] = [];

  for (const result of results) {
    const combinedText = `${result.title} ${result.content}`;

    // Split content into chunks that might represent individual events
    const sentences = result.content.split(/[.\n]+/).filter((s) => s.trim().length > 20);

    // If the result itself looks like a specific event (not a list page)
    const isSpecificEvent =
      result.title.length < 100 &&
      !result.title.toLowerCase().includes("events in malta") &&
      !result.title.toLowerCase().includes("what's on") &&
      !result.title.toLowerCase().includes("top 10") &&
      extractDateFromText(combinedText) !== null;

    if (isSpecificEvent) {
      const dateStr = extractDateFromText(combinedText);
      events.push({
        title: result.title.replace(/\s*[-|]\s*.*$/, "").trim(),
        description: sentences.slice(0, 3).join(". ").substring(0, 300),
        event_date: dateStr || (result.published_date ? result.published_date.substring(0, 10) : ""),
        event_date_parsed: dateStr,
        venue: extractVenue(combinedText),
        category,
        source_url: result.url,
        source_title: result.title,
      });
    } else {
      // Try to extract individual events from a list-style result
      for (const sentence of sentences) {
        const dateStr = extractDateFromText(sentence);
        if (dateStr && sentence.length > 30) {
          const title = sentence
            .replace(/^\d+\.\s*/, "")
            .replace(/\s*[-–]\s*\d{1,2}\s+\w+.*$/, "")
            .trim()
            .substring(0, 100);
          if (title.length > 10) {
            events.push({
              title,
              description: sentence.substring(0, 300),
              event_date: dateStr,
              event_date_parsed: dateStr,
              venue: extractVenue(sentence),
              category,
              source_url: result.url,
              source_title: result.title,
            });
          }
        }
      }
    }

    if (events.length >= 20) break;
  }

  return events;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tavilyKey = Deno.env.get("TAVILY_API_KEY");
    if (!tavilyKey) {
      return new Response(
        JSON.stringify({ error: "TAVILY_API_KEY not configured", events: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check / update last checked time
    const { data: lastCheckedRow } = await supabase
      .from("assistant_last_checked")
      .select("last_checked_at")
      .eq("user_id", user.id)
      .maybeSingle();

    const lastCheckedAt = lastCheckedRow?.last_checked_at ?? "2000-01-01T00:00:00Z";
    const now = new Date().toISOString();

    // Upsert last checked time immediately
    await supabase
      .from("assistant_last_checked")
      .upsert({ user_id: user.id, last_checked_at: now }, { onConflict: "user_id" });

    // Search Tavily for each category
    const allNewEvents: DiscoveredEvent[] = [];

    for (const { query, category } of CATEGORY_QUERIES) {
      try {
        const tavilyRes = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query,
            search_depth: "basic",
            max_results: 5,
            include_answer: false,
          }),
        });

        if (!tavilyRes.ok) continue;

        const tavilyData: TavilyResponse = await tavilyRes.json();
        const parsed = parseEventsFromResults(tavilyData.results ?? [], category);
        allNewEvents.push(...parsed);
      } catch {
        // Continue with other categories if one fails
        continue;
      }
    }

    // Deduplicate by title similarity (simple lowercase comparison)
    const seen = new Set<string>();
    const deduped = allNewEvents.filter((e) => {
      const key = e.title.toLowerCase().substring(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Get existing event titles to avoid re-inserting duplicates
    const { data: existing } = await supabase
      .from("discovered_events")
      .select("title")
      .eq("user_id", user.id);

    const existingTitles = new Set(
      (existing ?? []).map((e: { title: string }) => e.title.toLowerCase().substring(0, 40))
    );

    const todayStr = new Date().toISOString().substring(0, 10);

    const toInsert = deduped
      .filter((e) => {
        // Only insert events with a future or today date (or no parsed date)
        if (e.event_date_parsed && e.event_date_parsed < todayStr) return false;
        return !existingTitles.has(e.title.toLowerCase().substring(0, 40));
      })
      .map((e) => ({ ...e, user_id: user.id }));

    if (toInsert.length > 0) {
      await supabase.from("discovered_events").insert(toInsert);
    }

    // Delete any stored past events to keep things clean
    await supabase
      .from("discovered_events")
      .delete()
      .eq("user_id", user.id)
      .lt("event_date_parsed", todayStr);

    // Return all non-dismissed future/undated events
    const { data: allEvents } = await supabase
      .from("discovered_events")
      .select("*")
      .eq("user_id", user.id)
      .eq("dismissed", false)
      .or(`event_date_parsed.gte.${todayStr},event_date_parsed.is.null`)
      .order("event_date_parsed", { ascending: true });

    return new Response(
      JSON.stringify({
        events: allEvents ?? [],
        new_count: toInsert.length,
        last_checked: lastCheckedAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err), events: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
