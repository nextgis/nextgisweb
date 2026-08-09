/*** Table: wfsserver_layer ***/

CREATE TABLE wfsserver_layer (
    service_id integer NOT NULL,
    resource_id integer NOT NULL,
    keyname character varying NOT NULL,
    display_name character varying NOT NULL,
    maxfeatures integer,
    PRIMARY KEY (service_id, resource_id),
    UNIQUE (service_id, keyname),
    FOREIGN KEY (service_id) REFERENCES wfsserver_service (id),
    FOREIGN KEY (resource_id) REFERENCES resource (id)
);

COMMENT ON TABLE wfsserver_layer IS 'wfsserver';

/*** Table: wfsserver_service ***/

CREATE TABLE wfsserver_service (
    id integer NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id)
);

COMMENT ON TABLE wfsserver_service IS 'wfsserver';
