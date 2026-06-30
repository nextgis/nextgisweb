/*** {
    "revision": "9fb8436d", "parents": ["00000000"],
    "date": "2026-06-30T00:00:00",
    "message": "Add point_cloud_style table"
} ***/

CREATE TABLE point_cloud_style (
    id integer NOT NULL,
    point_cloud_style_value jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT point_cloud_style_pkey PRIMARY KEY (id),
    CONSTRAINT point_cloud_style_id_fkey FOREIGN KEY (id) REFERENCES resource(id) ON DELETE CASCADE
);
