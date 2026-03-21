/*** { "revision": "14e17095" } ***/

CREATE INDEX idx_webmap_annotation_geom ON webmap_annotation USING GIST (geom);
