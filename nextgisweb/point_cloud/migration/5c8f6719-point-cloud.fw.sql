/*** {
    "revision": "5c8f6719", "parents": ["00000000"],
    "date": "2026-06-30T00:00:00",
    "message": "Add point_cloud table"
} ***/

CREATE TABLE point_cloud (
    id integer NOT NULL,
    fileobj_id integer,
    srs_id integer NOT NULL,
    source_type character varying NOT NULL DEFAULT 'upload',
    external_url text,
    point_count bigint NOT NULL DEFAULT 0,
    point_format_id smallint NOT NULL DEFAULT 0,
    epsg integer,
    wkt text,
    minx double precision NOT NULL DEFAULT 0,
    miny double precision NOT NULL DEFAULT 0,
    maxx double precision NOT NULL DEFAULT 0,
    maxy double precision NOT NULL DEFAULT 0,
    zmin double precision NOT NULL DEFAULT 0,
    zmax double precision NOT NULL DEFAULT 0,
    has_rgb boolean NOT NULL DEFAULT false,
    has_intensity boolean NOT NULL DEFAULT false,
    has_classification boolean NOT NULL DEFAULT false,
    has_returns boolean NOT NULL DEFAULT false,
    CONSTRAINT point_cloud_pkey PRIMARY KEY (id),
    CONSTRAINT point_cloud_id_fkey FOREIGN KEY (id) REFERENCES resource(id) ON DELETE CASCADE,
    CONSTRAINT point_cloud_fileobj_id_fkey FOREIGN KEY (fileobj_id) REFERENCES fileobj(id),
    CONSTRAINT point_cloud_srs_id_fkey FOREIGN KEY (srs_id) REFERENCES srs(id),
    CONSTRAINT point_cloud_source_type_check CHECK (source_type IN ('upload', 'external_url'))
);
