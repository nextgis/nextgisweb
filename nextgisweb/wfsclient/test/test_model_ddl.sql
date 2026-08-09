/*** Table: layer_field_wfsclient_layer ***/

CREATE TABLE layer_field_wfsclient_layer (
    id integer NOT NULL,
    column_name character varying NOT NULL,
    orig_datatype character varying(50) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES layer_field (id)
);

COMMENT ON TABLE layer_field_wfsclient_layer IS 'wfsclient';

/*** Table: wfsclient_connection ***/

CREATE TABLE wfsclient_connection (
    id integer NOT NULL,
    path character varying NOT NULL,
    username character varying,
    password character varying,
    version character varying(50) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id)
);

COMMENT ON TABLE wfsclient_connection IS 'wfsclient';

/*** Table: wfsclient_layer ***/

CREATE TABLE wfsclient_layer (
    id integer NOT NULL,
    connection_id integer NOT NULL,
    layer_name character varying NOT NULL,
    column_geom character varying NOT NULL,
    geometry_srid integer NOT NULL,
    srs_id integer NOT NULL,
    geometry_type character varying(50) NOT NULL,
    feature_label_field_id integer,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id),
    FOREIGN KEY (connection_id) REFERENCES wfsclient_connection (id),
    FOREIGN KEY (srs_id) REFERENCES srs (id),
    FOREIGN KEY (feature_label_field_id) REFERENCES layer_field_wfsclient_layer (id)
);

COMMENT ON TABLE wfsclient_layer IS 'wfsclient';
