/*** {
    "revision": "2c1c1918", "parents": ["00000000"],
    "date": "2021-01-11T17:32:41",
    "message": "Add catalog id"
} ***/

ALTER TABLE srs ADD COLUMN catalog_id integer;
ALTER TABLE srs ADD CONSTRAINT srs_catalog_id_key UNIQUE (catalog_id);
