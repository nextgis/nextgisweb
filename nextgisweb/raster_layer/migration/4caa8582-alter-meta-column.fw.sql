/*** {
    "revision": "4caa8582", "parents": ["4ca9e701"],
    "date": "2025-06-25T12:19:13",
    "message": "Alter meta column"
} ***/

ALTER TABLE raster_layer ALTER COLUMN meta SET NOT NULL;
