/*** {
    "revision": "9af102d0", "parents": ["4da181ed"],
    "date": "2026-03-16T00:00:00",
    "message": "Add raster_layer_storage table"
} ***/

CREATE TABLE raster_layer_storage (
    id integer NOT NULL,
    endpoint character varying NOT NULL,
    bucket character varying NOT NULL,
    access_key character varying NOT NULL,
    secret_key character varying NOT NULL,
    prefix character varying NOT NULL,
    CONSTRAINT raster_layer_storage_pkey PRIMARY KEY (id),
    CONSTRAINT raster_layer_storage_id_fkey FOREIGN KEY (id)
        REFERENCES resource (id)
);

COMMENT ON TABLE raster_layer_storage IS 'raster_layer';

ALTER TABLE raster_layer
    ADD COLUMN storage_id integer REFERENCES raster_layer_storage(id),
    ADD COLUMN storage_filename character varying;
