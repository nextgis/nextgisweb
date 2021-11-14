/*** {
    "revision": "3241f19e", "parents": ["2ea54a77"],
    "date": "2021-11-14T17:43:30",
    "message": "Add cloud_optimized column"
} ***/

ALTER TABLE raster_layer ADD COLUMN cloud_optimized boolean;
UPDATE raster_layer SET cloud_optimized = FALSE;
ALTER TABLE raster_layer ALTER COLUMN cloud_optimized SET NOT NULL;
