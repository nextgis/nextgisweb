/*** {
    "revision": "2c3ce7cd", "parents": ["2b7e8ee6"],
    "date": "2021-01-18T03:08:15",
    "message": "Add lookup_table_id column"
} ***/

ALTER TABLE layer_field ADD COLUMN lookup_table_id integer;
ALTER TABLE layer_field  ADD CONSTRAINT layer_field_lookup_table_id_fkey
    FOREIGN KEY (lookup_table_id) REFERENCES lookup_table (id);
