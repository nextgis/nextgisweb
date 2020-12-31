ALTER TABLE srs ADD COLUMN catalog_id integer;
ALTER TABLE srs ADD CONSTRAINT srs_catalog_id_key UNIQUE (catalog_id);
