-- Update the misspelled location name from "All HNG Locations" to "All HNHG Locations"
UPDATE locations 
SET name = 'All HNHG Locations', updated_at = now()
WHERE id = '93cd36b7-790c-4d29-9344-631188af32e4';