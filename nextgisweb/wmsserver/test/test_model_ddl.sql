/*** Table: wmsserver_layer ***/

CREATE TABLE wmsserver_layer (
    service_id integer NOT NULL,
    resource_id integer NOT NULL,
    keyname character varying NOT NULL,
    display_name character varying NOT NULL,
    min_scale_denom double precision,
    max_scale_denom double precision,
    position integer,
    PRIMARY KEY (service_id, resource_id),
    FOREIGN KEY (service_id) REFERENCES wmsserver_service (id),
    FOREIGN KEY (resource_id) REFERENCES resource (id)
);

COMMENT ON TABLE wmsserver_layer IS 'wmsserver';

/*** Table: wmsserver_service ***/

CREATE TABLE wmsserver_service (
    id integer NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id)
);

COMMENT ON TABLE wmsserver_service IS 'wmsserver';
