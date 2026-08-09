/*** Table: resource_tile_cache ***/

CREATE TABLE resource_tile_cache (
    resource_id integer NOT NULL,
    uuid uuid NOT NULL,
    enabled boolean NOT NULL,
    image_compose boolean NOT NULL,
    max_z smallint,
    ttl integer,
    PRIMARY KEY (resource_id),
    FOREIGN KEY (resource_id) REFERENCES resource (id)
);

COMMENT ON TABLE resource_tile_cache IS 'render';

CREATE SCHEMA IF NOT EXISTS tile_cache;
