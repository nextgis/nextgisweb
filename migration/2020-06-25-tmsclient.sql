CREATE TABLE tmsclient_connection (
    id integer NOT NULL,
    capmode character varying(19),
    url_template character varying NOT NULL,
    apikey character varying,
    apikey_param character varying,
    scheme character varying(3) NOT NULL,
    CONSTRAINT tmsclient_connection_pkey PRIMARY KEY (id),
    CONSTRAINT tmsclient_connection_id_fkey FOREIGN KEY (id)
        REFERENCES resource (id),
    CONSTRAINT tmsclient_connection_capmode_check CHECK
        (capmode::text = 'nextgis_geoservices'::text),
    CONSTRAINT tmsclient_connection_scheme_check CHECK
        (scheme::text = ANY (ARRAY['xyz'::character varying, 'tms'::character varying]::text[]))
);

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
    CONSTRAINT tmsclient_layer_pkey PRIMARY KEY (id),
    CONSTRAINT tmsclient_layer_connection_id_fkey FOREIGN KEY (connection_id)
        REFERENCES tmsclient_connection (id),
    CONSTRAINT tmsclient_layer_id_fkey FOREIGN KEY (id)
        REFERENCES resource (id),
    CONSTRAINT tmsclient_layer_srs_id_fkey FOREIGN KEY (srs_id)
        REFERENCES srs (id)
);

COMMENT ON TABLE tmsclient_connection IS 'tmsclient';
COMMENT ON TABLE tmsclient_layer IS 'tmsclient';