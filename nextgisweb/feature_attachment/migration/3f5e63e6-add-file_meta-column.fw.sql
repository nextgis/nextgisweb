/*** {
    "revision": "3f5e63e6", "parents": ["3cab998c"],
    "date": "2023-08-31T11:24:04",
    "message": "Add file_meta column"
} ***/

ALTER TABLE feature_attachment ADD COLUMN file_meta jsonb;
