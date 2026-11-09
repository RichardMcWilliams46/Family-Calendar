/*
# Restrict shared event color writes

1. Purpose
- Keep shared event colors readable and editable by signed-in users.
- Remove unused insert and delete privileges from the color settings table.

2. Modified tables
- `event_type_colors`
  - Signed-in users retain SELECT and UPDATE access.
  - INSERT and DELETE table privileges are revoked because the app manages the seeded event types only.

3. Security
- Row-level security remains enabled.
- Existing signed-in shared configuration policies remain unchanged.
*/

REVOKE INSERT, DELETE ON event_type_colors FROM authenticated;
GRANT SELECT, UPDATE ON event_type_colors TO authenticated;
