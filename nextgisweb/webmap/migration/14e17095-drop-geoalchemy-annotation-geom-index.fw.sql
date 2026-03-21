/*** {
    "revision": "14e17095", "parents": ["4a6a7a01"],
    "date": "2026-03-24T00:00:00",
    "message": "Drop GeoAlchemy annotation geom index"
} ***/

DROP INDEX IF EXISTS idx_webmap_annotation_geom;
