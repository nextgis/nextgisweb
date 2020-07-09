ALTER TABLE layer_field DROP CONSTRAINT layer_field_datatype_check;
ALTER TABLE layer_field DROP CONSTRAINT layer_field_datatype_check1;

ALTER TABLE layer_field
  ADD CONSTRAINT layer_field_datatype_check CHECK (datatype::text = ANY (ARRAY['INTEGER'::character varying, 'BIGINT'::character varying, 'REAL'::character varying, 'STRING'::character varying, 'DATE'::character varying, 'TIME'::character varying, 'DATETIME'::character varying]::text[]));
