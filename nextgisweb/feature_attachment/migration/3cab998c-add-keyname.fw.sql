/*** {
    "revision": "3cab998c", "parents": ["3c7119ac"],
    "date": "2023-04-18T17:22:06",
    "message": "Add keyname"
} ***/

ALTER TABLE feature_attachment ADD COLUMN keyname varchar NULL;

ALTER TABLE feature_attachment
    ADD CONSTRAINT feature_attachment_keyname_unique
    UNIQUE (resource_id, feature_id, keyname)
    DEFERRABLE INITIALLY DEFERRED;
