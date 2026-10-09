import { useState, useEffect } from 'react';
import { supabase, EventTypeColor } from '../lib/supabase';
import { Palette, Save } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Blue', value: '#0EA5E9' },
  { name: 'Green', value: '#10B981' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Gray', value: '#6B7280' },
];

interface ColorSettingsProps {
  eventTypeColors: EventTypeColor[];
  onSave: () => void;
}

export default function ColorSettings({ eventTypeColors, onSave }: ColorSettingsProps) {
  const [colors, setColors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const colorMap: { [key: string]: string } = {};
    eventTypeColors.forEach(etc => {
      colorMap[etc.event_type] = etc.color;
    });
    setColors(colorMap);
  }, [eventTypeColors]);

  const handleColorChange = (eventType: string, color: string) => {
    setColors(prev => ({ ...prev, [eventType]: color }));
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      for (const [eventType, color] of Object.entries(colors)) {
        const { error } = await supabase
          .from('event_type_colors')
          .update({ color, updated_at: new Date().toISOString() })
          .eq('event_type', eventType);

        if (error) throw error;

        const { error: eventsError } = await supabase
          .from('calendar_events')
          .update({ color })
          .eq('event_type', eventType);

        if (eventsError) throw eventsError;
      }

      setSaved(true);
      onSave();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Palette className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-amber-900">Event Type Colors</h2>
          <p className="text-sm text-amber-600">Set default colors for each event type</p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-200/50 shadow-sm p-4 sm:p-6">
        <p className="text-sm text-amber-700/80 mb-5">
          When you change a color, all existing events of that type will be updated to match.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(colors).map(([eventType, selectedColor]) => (
            <div key={eventType} className="bg-amber-50/60 rounded-xl p-4 border border-amber-100">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg shadow-sm flex-shrink-0"
                  style={{ backgroundColor: selectedColor }}
                />
                <label htmlFor={`color-${eventType}`} className="text-sm font-bold text-amber-900">
                  {eventType}
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => handleColorChange(eventType, color.value)}
                    className={`w-7 h-7 rounded-lg transition-all duration-200 transform active:scale-90 sm:hover:scale-110 ${
                      selectedColor === color.value
                        ? 'ring-2 ring-amber-400 ring-offset-1'
                        : 'sm:hover:ring-1 sm:hover:ring-amber-300'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    aria-label={color.name}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-5 bg-red-50/80 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:scale-95"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Colors'}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium animate-fadeIn">Saved!</span>
          )}
        </div>
      </div>
    </div>
  );
}
