/*** { "revision": "a3f8d916" } ***/

ALTER TABLE raster_layer_storage
    ALTER COLUMN access_key SET NOT NULL,
    ALTER COLUMN secret_key SET NOT NULL;
