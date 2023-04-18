/*** { "revision": "3cab998c" } ***/

ALTER TABLE feature_attachment DROP CONSTRAINT feature_attachment_keyname_unique;

ALTER TABLE feature_attachment DROP COLUMN keyname;