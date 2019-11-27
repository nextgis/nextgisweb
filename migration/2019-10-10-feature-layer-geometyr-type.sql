ALTER TABLE public.vector_layer DROP CONSTRAINT vector_layer_geometry_type_check;
ALTER TABLE public.vector_layer ADD CONSTRAINT vector_layer_geometry_type_check
  CHECK (geometry_type = ANY (ARRAY[
	'POINT', 'LINESTRING', 'POLYGON',
	'MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON',
	'POINTZ', 'LINESTRINGZ', 'POLYGONZ',
	'MULTIPOINTZ', 'MULTILINESTRINGZ', 'MULTIPOLYGONZ']::text[]));


ALTER TABLE public.postgis_layer DROP CONSTRAINT postgis_layer_geometry_type_check;
ALTER TABLE public.postgis_layer ADD CONSTRAINT postgis_layer_geometry_type_check
  CHECK (geometry_type = ANY (ARRAY[
	'POINT', 'LINESTRING', 'POLYGON',
	'MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON',
	'POINTZ', 'LINESTRINGZ', 'POLYGONZ',
	'MULTIPOINTZ', 'MULTILINESTRINGZ', 'MULTIPOLYGONZ']::text[]));
