/*** {
    "revision": "51eeaad8", "parents": ["51299994"],
    "date": "2026-03-15T11:51:17",
    "message": "Move file meta to file_storage"
} ***/

INSERT INTO file_meta (fileobj_id, value)
SELECT fileobj_id, file_meta
FROM feature_attachment;

ALTER TABLE feature_attachment DROP COLUMN file_meta;
