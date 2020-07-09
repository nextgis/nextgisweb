ALTER TABLE vector_layer ALTER COLUMN geometry_type TYPE character varying(15);
ALTER TABLE postgis_layer ALTER COLUMN geometry_type TYPE character varying(15);

ALTER TABLE vector_layer DROP CONSTRAINT vector_layer_geometry_type_check1;
ALTER TABLE postgis_layer DROP CONSTRAINT postgis_layer_geometry_type_check1;

ALTER TABLE postgis_layer DROP CONSTRAINT postgis_layer_geometry_type_check;
ALTER TABLE postgis_layer
  ADD CONSTRAINT postgis_layer_geometry_type_check CHECK (geometry_type::text = ANY (ARRAY['POINT'::character varying, 'LINESTRING'::character varying, 'POLYGON'::character varying, 'MULTIPOINT'::character varying, 'MULTILINESTRING'::character varying, 'MULTIPOLYGON'::character varying]::text[]));

ALTER TABLE vector_layer DROP CONSTRAINT vector_layer_geometry_type_check;
ALTER TABLE vector_layer
  ADD CONSTRAINT vector_layer_geometry_type_check CHECK (geometry_type::text = ANY (ARRAY['POINT'::character varying, 'LINESTRING'::character varying, 'POLYGON'::character varying, 'MULTIPOINT'::character varying, 'MULTILINESTRING'::character varying, 'MULTIPOLYGON'::character varying]::text[]));
