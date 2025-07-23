/*** {
    "revision": "4d12e52e", "parents": ["314b36a0"],
    "date": "2025-07-15T20:57:38",
    "message": "Add z_min and z_max columns"
} ***/

ALTER TABLE basemap_layer ADD COLUMN z_min integer;
ALTER TABLE basemap_layer ADD COLUMN z_max integer;
