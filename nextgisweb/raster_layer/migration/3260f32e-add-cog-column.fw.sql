/*** {
    "revision": "3260f32e", "parents": ["2ea54a77"],
    "date": "2021-11-20T18:53:04",
    "message": "Add cog column"
} ***/

ALTER TABLE raster_layer ADD COLUMN cog boolean;
UPDATE raster_layer SET cog = FALSE;
ALTER TABLE raster_layer ALTER COLUMN cog SET NOT NULL;
