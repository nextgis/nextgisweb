/*** Table: layer_field_postgis_layer ***/

CREATE TABLE layer_field_postgis_layer (
    id integer NOT NULL,
    column_name character varying NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES layer_field (id)
);

COMMENT ON TABLE layer_field_postgis_layer IS 'postgis';

/*** Table: postgis_connection ***/

CREATE TABLE postgis_connection (
    id integer NOT NULL,
    hostname character varying NOT NULL,
    database character varying NOT NULL,
    username character varying NOT NULL,
    password character varying NOT NULL,
    port integer,
    sslmode character varying(50),
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id)
);

COMMENT ON TABLE postgis_connection IS 'postgis';

/*** Table: postgis_layer ***/

CREATE TABLE postgis_layer (
    id integer NOT NULL,
    connection_id integer NOT NULL,
    schema character varying NOT NULL,
    "table" character varying NOT NULL,
    column_id character varying NOT NULL,
    column_geom character varying NOT NULL,
    geometry_srid integer NOT NULL,
    srs_id integer NOT NULL,
    geometry_type character varying(50) NOT NULL,
    feature_label_field_id integer,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id),
    FOREIGN KEY (connection_id) REFERENCES resource (id),
    FOREIGN KEY (srs_id) REFERENCES srs (id),
    FOREIGN KEY (feature_label_field_id) REFERENCES layer_field_postgis_layer (id)
);

COMMENT ON TABLE postgis_layer IS 'postgis';
