/*** Table: ogcfserver_collection ***/

CREATE TABLE ogcfserver_collection (
    service_id integer NOT NULL,
    resource_id integer NOT NULL,
    keyname character varying NOT NULL,
    display_name character varying NOT NULL,
    maxfeatures integer,
    PRIMARY KEY (service_id, resource_id),
    UNIQUE (service_id, keyname),
    FOREIGN KEY (service_id) REFERENCES ogcfserver_service (id),
    FOREIGN KEY (resource_id) REFERENCES resource (id)
);

COMMENT ON TABLE ogcfserver_collection IS 'ogcfserver';

/*** Table: ogcfserver_service ***/

CREATE TABLE ogcfserver_service (
    id integer NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id)
);

COMMENT ON TABLE ogcfserver_service IS 'ogcfserver';
