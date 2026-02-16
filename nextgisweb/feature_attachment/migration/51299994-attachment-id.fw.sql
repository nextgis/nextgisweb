/*** {
    "revision": "51299994", "parents": ["420c3c4e"],
    "date": "2026-02-05T01:15:20",
    "message": "Attachment ID"
} ***/

DROP INDEX feature_attachment_resource_id_feature_id_idx;
ALTER TABLE feature_attachment DROP CONSTRAINT feature_attachment_pkey;
ALTER TABLE feature_attachment DROP COLUMN size;
ALTER TABLE feature_attachment RENAME id TO extension_id;
ALTER SEQUENCE feature_attachment_id_seq RENAME TO feature_attachment_extension_id_seq;
ALTER TABLE feature_attachment ADD CONSTRAINT feature_attachment_pkey PRIMARY KEY (resource_id, feature_id, extension_id);
ALTER TABLE feature_attachment ADD CONSTRAINT feature_attachment_extension_id_unique UNIQUE (resource_id, extension_id)
