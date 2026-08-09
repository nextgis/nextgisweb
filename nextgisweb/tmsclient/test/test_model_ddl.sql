/*** Table: tmsclient_connection ***/

CREATE TABLE tmsclient_connection (
    id integer NOT NULL,
    capmode character varying(50),
    url_template character varying NOT NULL,
    apikey character varying,
    apikey_param character varying,
    username character varying,
    password character varying,
    scheme character varying(50) NOT NULL,
    insecure boolean NOT NULL,
    referer character varying,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id)
);

COMMENT ON TABLE tmsclient_connection IS 'tmsclient';

/*** Table: tmsclient_layer ***/

CREATE TABLE tmsclient_layer (
    id integer NOT NULL,
    connection_id integer NOT NULL,
    layer_name character varying,
    tilesize integer NOT NULL,
    minzoom integer NOT NULL,
    maxzoom integer NOT NULL,
    extent_left double precision,
    extent_right double precision,
    extent_bottom double precision,
    extent_top double precision,
    srs_id integer NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id),
    FOREIGN KEY (connection_id) REFERENCES tmsclient_connection (id),
    FOREIGN KEY (srs_id) REFERENCES srs (id)
);

COMMENT ON TABLE tmsclient_layer IS 'tmsclient';
