/*** {
    "revision": "55b35a8a", "parents": ["55b345cb"],
    "date": "2026-09-19T16:10:09",
    "message": "Fix migration defaults"
} ***/

ALTER TABLE webmap
    ALTER COLUMN editable DROP DEFAULT,
    ALTER COLUMN annotation_enabled DROP DEFAULT,
    ALTER COLUMN annotation_default DROP DEFAULT;

ALTER TABLE webmap_annotation ALTER COLUMN public DROP DEFAULT;
