/*** Table: point_cloud_layer ***/

CREATE TABLE point_cloud_layer (
    id integer NOT NULL,
    fileobj_id integer NOT NULL,
    point_count bigint NOT NULL,
    point_format_id smallint NOT NULL,
    minx double precision NOT NULL,
    miny double precision NOT NULL,
    maxx double precision NOT NULL,
    maxy double precision NOT NULL,
    zmin double precision NOT NULL,
    zmax double precision NOT NULL,
    has_rgb boolean NOT NULL,
    has_intensity boolean NOT NULL,
    has_classification boolean NOT NULL,
    has_returns boolean NOT NULL,
    z_unit_factor double precision,
    rgb_max integer,
    srs_id integer NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES resource (id),
    FOREIGN KEY (fileobj_id) REFERENCES fileobj (id),
    FOREIGN KEY (srs_id) REFERENCES srs (id)
);

COMMENT ON TABLE point_cloud_layer IS 'point_cloud';
