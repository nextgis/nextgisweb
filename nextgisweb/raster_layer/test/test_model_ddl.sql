/*** Table: raster_layer ***/

CREATE TABLE raster_layer (
    id integer NOT NULL,
    fileobj_id integer,
    fileobj_pam_id integer,
    xsize integer NOT NULL,
    ysize integer NOT NULL,
    dtype character varying NOT NULL,
    band_count integer NOT NULL,
    geo_transform double precision[],
    cog boolean NOT NULL,
    meta jsonb,
    storage_id integer,
    storage_filename character varying,
    srs_id integer NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id),
    FOREIGN KEY (fileobj_id) REFERENCES fileobj (id),
    FOREIGN KEY (fileobj_pam_id) REFERENCES fileobj (id),
    FOREIGN KEY (storage_id) REFERENCES raster_layer_storage (id),
    FOREIGN KEY (srs_id) REFERENCES srs (id)
);

COMMENT ON TABLE raster_layer IS 'raster_layer';

/*** Table: raster_layer_storage ***/

CREATE TABLE raster_layer_storage (
    id integer NOT NULL,
    endpoint character varying NOT NULL,
    bucket character varying NOT NULL,
    access_key character varying,
    secret_key character varying,
    prefix character varying NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id)
);

COMMENT ON TABLE raster_layer_storage IS 'raster_layer';
