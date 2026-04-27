/*** {
    "revision": "a3f8d916", "parents": ["9af102d0"],
    "date": "2026-04-27T00:00:00",
    "message": "Add no_sign_request to raster_layer_storage"
} ***/

ALTER TABLE raster_layer_storage
    ADD COLUMN no_sign_request boolean NOT NULL DEFAULT FALSE,
    ALTER COLUMN access_key DROP NOT NULL,
    ALTER COLUMN secret_key DROP NOT NULL;
