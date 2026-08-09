/*** Table: layer_field_vector_layer ***/

CREATE TABLE layer_field_vector_layer (
    id integer NOT NULL,
    fld_uuid character varying(32) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES layer_field (id)
);

COMMENT ON TABLE layer_field_vector_layer IS 'vector_layer';

/*** Table: vector_layer ***/

CREATE TABLE vector_layer (
    id integer NOT NULL,
    tbl_uuid character varying(32) NOT NULL,
    srs_id integer,
    geometry_type character varying(50) NOT NULL,
    feature_label_field_id integer,
    PRIMARY KEY (id),
    CONSTRAINT vector_layer_geom_type_srs_check CHECK ((
        geometry_type = 'NONE'
    ) = (
        srs_id IS NULL
    )),
    FOREIGN KEY (id) REFERENCES resource (id),
    FOREIGN KEY (srs_id) REFERENCES srs (id),
    FOREIGN KEY (feature_label_field_id) REFERENCES layer_field_vector_layer (id)
);

COMMENT ON TABLE vector_layer IS 'vector_layer';

CREATE SCHEMA vector_layer;
