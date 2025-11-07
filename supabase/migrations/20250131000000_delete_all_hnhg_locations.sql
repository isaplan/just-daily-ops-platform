-- Delete "All HNHG Locations" from locations table
-- This is not a real location, just a legacy import indicator

DELETE FROM locations 
WHERE name = 'All HNHG Locations' OR name = 'All HNG Locations';

-- Verify deletion (returns count)
SELECT COUNT(*) as remaining_locations FROM locations;

