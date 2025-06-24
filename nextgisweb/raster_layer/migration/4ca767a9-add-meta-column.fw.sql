/*** {
    "revision": "4ca767a9", "parents": ["4c303b5e"],
    "date": "2025-06-24T21:43:46",
    "message": "Add meta column"
} ***/

ALTER TABLE raster_layer ADD COLUMN meta jsonb;
