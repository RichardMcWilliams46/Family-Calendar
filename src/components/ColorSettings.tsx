import { useState, useEffect } from 'react';
import { supabase, EventTypeColor } from '../lib/supabase';
import { X, Palette, Save } from 'lucide-react';

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
  onClose: () => void;
  onSave: () => void;
}

export default function ColorSettings({ eventTypeColors, onClose, onSave }: ColorSettingsProps) {
  const [colors, setColors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const colorMap: { [key: string]: string } = {};
    eventTypeColors.forEach(etc => {
      colorMap[etc.event_type] = etc.color;
    });
    setColors(colorMap);
  }, [eventTypeColors]);

  const handleColorChange = (eventType: string, color: string) => {
    setColors(prev => ({ ...prev, [eventType]: color }));
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

      onSave();
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white px-8 py-6 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <Palette className="w-7 h-7" />
            <h2 className="text-3xl font-bold">Event Type Colors</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          <p className="text-gray-600 mb-6">
            Set default colors for each event type. When you change a color, all existing events of that type will be updated to match.
          </p>

          <div className="space-y-4">
            {Object.entries(colors).map(([eventType, selectedColor]) => (
              <div key={eventType} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg shadow-md flex-shrink-0"
                    style={{ backgroundColor: selectedColor }}
                  />
                  <div className="flex-1">
                    <label htmlFor={`color-${eventType}`} className="text-base font-bold text-gray-800 block mb-1">
                      {eventType}
                    </label>
                  </div>
                  <select
                    id={`color-${eventType}`}
                    value={selectedColor}
                    onChange={(e) => handleColorChange(eventType, e.target.value)}
                    className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all duration-200 font-medium"
                  >
                    {PRESET_COLORS.map(color => (
                      <option key={color.value} value={color.value}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-6 bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-6 mt-6 border-t-2 border-gray-200">
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : 'Save Colors'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
