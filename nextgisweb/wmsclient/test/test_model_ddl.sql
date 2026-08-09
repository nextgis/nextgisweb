/*** Table: wmsclient_connection ***/

CREATE TABLE wmsclient_connection (
    id integer NOT NULL,
    url character varying NOT NULL,
    version character varying(50) NOT NULL,
    username character varying,
    password character varying,
    insecure boolean NOT NULL,
    referer character varying,
    capcache_xml character varying,
    capcache_json jsonb,
    capcache_tstamp timestamp without time zone,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id)
);

COMMENT ON TABLE wmsclient_connection IS 'wmsclient';

/*** Table: wmsclient_layer ***/

CREATE TABLE wmsclient_layer (
    id integer NOT NULL,
    connection_id integer NOT NULL,
    wmslayers character varying NOT NULL,
    imgformat character varying NOT NULL,
    vendor_params jsonb NOT NULL,
    remote_srs_id integer NOT NULL,
    srs_id integer NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id),
    FOREIGN KEY (connection_id) REFERENCES resource (id),
    FOREIGN KEY (remote_srs_id) REFERENCES srs (id),
    FOREIGN KEY (srs_id) REFERENCES srs (id)
);

COMMENT ON TABLE wmsclient_layer IS 'wmsclient';
