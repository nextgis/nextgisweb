/*** Table: resmeta_item ***/

CREATE TABLE resmeta_item (
    resource_id integer NOT NULL,
    key character varying(255) NOT NULL,
    vinteger integer,
    vfloat double precision,
    vtext character varying,
    vboolean boolean,
    PRIMARY KEY (resource_id, key),
    FOREIGN KEY (resource_id) REFERENCES resource (id)
);

COMMENT ON TABLE resmeta_item IS 'resmeta';
