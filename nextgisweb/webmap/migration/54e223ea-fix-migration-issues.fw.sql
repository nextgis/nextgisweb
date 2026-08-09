/*** {
    "revision": "54e223ea", "parents": ["14e17095"],
    "date": "2026-08-09T20:42:27",
    "message": "Fix migration issues"
} ***/

UPDATE webmap SET
    annotation_enabled = coalesce(annotation_enabled, FALSE),
    annotation_default = coalesce(annotation_default, 'no')
WHERE annotation_enabled IS NULL OR annotation_default IS NULL;

ALTER TABLE webmap
    ALTER COLUMN annotation_enabled SET NOT NULL,
    ALTER COLUMN annotation_default SET NOT NULL;

ALTER TABLE webmap_item ALTER COLUMN layer_adapter TYPE character varying;

UPDATE webmap_annotation SET public = TRUE WHERE public IS NULL;

ALTER TABLE webmap_annotation
    ALTER COLUMN public SET NOT NULL,
    DROP CONSTRAINT IF EXISTS user_id_fk,
    DROP CONSTRAINT IF EXISTS webmap_annotation_user_id_fkey,
    ADD FOREIGN KEY (user_id) REFERENCES auth_principal (id);
