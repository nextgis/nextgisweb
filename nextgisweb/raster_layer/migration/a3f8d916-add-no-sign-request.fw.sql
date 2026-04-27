/*** {
    "revision": "a3f8d916", "parents": ["9af102d0"],
    "date": "2026-04-27T00:00:00",
    "message": "Make raster_layer_storage keys nullable for public bucket support"
} ***/

ALTER TABLE raster_layer_storage
    ALTER COLUMN access_key DROP NOT NULL,
    ALTER COLUMN secret_key DROP NOT NULL;
