/*** Table: tileset ***/

CREATE TABLE tileset (
    id integer NOT NULL,
    fileobj_id integer NOT NULL,
    tileset_zmin smallint NOT NULL,
    tileset_zmax smallint NOT NULL,
    tileset_ntiles integer[] NOT NULL,
    minx double precision NOT NULL,
    miny double precision NOT NULL,
    maxx double precision NOT NULL,
    maxy double precision NOT NULL,
    srs_id integer NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id),
    FOREIGN KEY (fileobj_id) REFERENCES fileobj (id),
    FOREIGN KEY (srs_id) REFERENCES srs (id)
);

COMMENT ON TABLE tileset IS 'tileset';
