/*** { "revision": "2c3ce7cd" } ***/

ALTER TABLE layer_field DROP CONSTRAINT layer_field_lookup_table_id_fkey;
ALTER TABLE layer_field DROP COLUMN lookup_table_id;

