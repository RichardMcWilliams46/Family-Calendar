-- Update "Other" from grey #6B7280 to terracotta #C2410C
UPDATE event_type_colors SET color = '#C2410C', updated_at = now() WHERE color = '#6B7280';

-- Update "Anniversary" from purple #8B5CF6 to coral #FB7185
UPDATE event_type_colors SET color = '#FB7185', updated_at = now() WHERE color = '#8B5CF6';

-- Update any existing events that were saved with the old grey
UPDATE calendar_events SET color = '#C2410C' WHERE color = '#6B7280';

-- Update any existing events that were saved with the old purple
UPDATE calendar_events SET color = '#FB7185' WHERE color = '#8B5CF6';