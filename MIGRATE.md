`-- example of upgrade command. migration.sql have to consist below sql commands`

`-- psql -d <database_name> -h 192.168.250.1 -U ngw_admin -a -f migration.sql`

#### (2019-05-30)

```sql

ALTER TABLE srs ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE srs_id_seq;
ALTER TABLE srs ADD COLUMN auth_name character varying;
ALTER TABLE srs ADD COLUMN auth_srid integer;
ALTER TABLE srs ADD COLUMN wkt character varying NOT NULL DEFAULT ''; 
ALTER TABLE srs ADD COLUMN proj4 character varying NOT NULL DEFAULT ''; 

CREATE OR REPLACE FUNCTION srs_spatial_ref_sys_sync() RETURNS TRIGGER
LANGUAGE 'plpgsql' AS $BODY$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update existing spatial_ref_sys row
        UPDATE spatial_ref_sys SET
        auth_name = NEW.auth_name, auth_srid = NEW.auth_srid,
        srtext = NEW.wkt, proj4text = NEW.proj4
        WHERE srid = NEW.id;
        
        -- Insert if missing
        INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text)
        SELECT NEW.id, NEW.auth_name, NEW.auth_srid, NEW.wkt, NEW.proj4
        WHERE NOT EXISTS(SELECT * FROM spatial_ref_sys WHERE srid = NEW.id);

        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        -- Delete existing row
        DELETE FROM spatial_ref_sys WHERE srid = OLD.id;
        RETURN OLD;
    END IF;
END
$BODY$;

TRUNCATE TABLE spatial_ref_sys;

DROP TRIGGER IF EXISTS spatial_ref_sys ON srs;
CREATE TRIGGER spatial_ref_sys AFTER INSERT OR UPDATE OR DELETE ON srs
    FOR EACH ROW EXECUTE PROCEDURE srs_spatial_ref_sys_sync();

UPDATE srs SET
  auth_name = 'EPSG', auth_srid = 3857,
  wkt = 'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["X",EAST],AXIS["Y",NORTH],EXTENSION["PROJ4","+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs"],AUTHORITY["EPSG","3857"]]',
  proj4 = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs'
WHERE id = 3857;

UPDATE srs SET
  auth_name = 'EPSG', auth_srid = 4326, 
  wkt = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]',
  proj4 = '+proj=longlat +datum=WGS84 +no_defs'
WHERE id = 4326;

INSERT INTO srs (id, auth_name, auth_srid, display_name, wkt, proj4, minx, miny, maxx, maxy)
SELECT
  4326, 'EPGSG', 4326, 'WGS 84 / Lon-lat (EPSG:4326)',
  'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]',
  '+proj=longlat +datum=WGS84 +no_defs',
  -180, -90, 180, 90
WHERE NOT EXISTS(SELECT * FROM srs WHERE id = 4326);

ALTER TABLE srs ALTER COLUMN wkt DROP DEFAULT;
ALTER TABLE srs ALTER COLUMN proj4 DROP DEFAULT;

CREATE SEQUENCE srs_id_seq START 990001 MINVALUE 990001 MAXVALUE 998999;
ALTER TABLE srs ALTER COLUMN id SET DEFAULT nextval('srs_id_seq'::regclass);

ALTER TABLE srs ADD CONSTRAINT srs_auth_check CHECK (auth_name IS NULL AND auth_srid IS NULL OR auth_name IS NOT NULL AND auth_srid IS NOT NULL);
ALTER TABLE srs ADD CONSTRAINT srs_id_check CHECK (id > 0 AND id <= 998999);
ALTER TABLE srs ADD CONSTRAINT srs_id_auth_check CHECK (auth_name IS NULL AND auth_srid IS NULL OR id < 990001);

```

#### (2019-05-16)

```sql
ALTER TABLE public.webmap ADD COLUMN editable boolean DEFAULT FALSE;
```

#### (2018-12-16)

```sql
ALTER TABLE postgis_connection ADD COLUMN port integer;
```

#### `-- e1ad5e94cef9ab9b605948f53331927b52c8f3c5` (2018-09-11)

```sql
ALTER TABLE public.resource ADD COLUMN creation_date timestamp without time zone;
UPDATE public.resource SET creation_date = '1970-01-01';
ALTER TABLE public.resource ALTER COLUMN creation_date SET NOT NULL;
```

#### `-- 229fd7b8d0866f712ebd0e171764700352c25303` (2018-02-02)

```sql
ALTER TABLE public.webmap ADD COLUMN draw_order_enabled boolean;
ALTER TABLE public.webmap_item ADD COLUMN draw_order_position integer;
```

#### `-- 229fd7b8d0866f712ebd0e171764700352c25303` (2017-02-13)

```sql
ALTER TABLE wmsclient_connection DROP CONSTRAINT wmsclient_connection_version_check;
ALTER TABLE wmsclient_connection DROP CONSTRAINT wmsclient_connection_version_check1;
ALTER TABLE wmsclient_connection ADD CONSTRAINT wmsclient_connection_version_check CHECK (version IN ('1.1.1', '1.3.0'));
```

#### `--9edfdefb13cc7a563109510a72d8402589046158` (2017-02-12)

```sql
ALTER TABLE layer_field DROP CONSTRAINT layer_field_datatype_check;
ALTER TABLE layer_field DROP CONSTRAINT layer_field_datatype_check1;

ALTER TABLE layer_field
  ADD CONSTRAINT layer_field_datatype_check CHECK (datatype::text = ANY (ARRAY['INTEGER'::character varying, 'BIGINT'::character varying, 'REAL'::character varying, 'STRING'::character varying, 'DATE'::character varying, 'TIME'::character varying, 'DATETIME'::character varying]::text[]));
```

#### `-- ee85d1ceb4976b20e9eeb0925b614a604554aeb7` (2016-03-08)

```sql
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
```

#### `-- 3a274762cecaf81f4fca75d96421243303792cef` (2015-06-30)

```sql
ALTER TABLE wmsclient_connection ADD COLUMN username character varying;
ALTER TABLE wmsclient_connection ADD COLUMN password character varying;
```


#### `-- cebcff51486370fe3fc164d38b45b7b0b58a61c8` (2015-09-21)

```sql
ALTER TABLE wfsserver_layer ADD COLUMN maxfeatures integer;
```


#### `-- 97ad027f58f4b20453dc1cf3b32897c73a4daa3e` (2015-10-01)

```sql
ALTER TABLE auth_principal ADD COLUMN description character varying;
ALTER TABLE auth_user ADD COLUMN superuser boolean;
ALTER TABLE auth_user ADD COLUMN disabled boolean;
UPDATE auth_user SET superuser = FALSE;
UPDATE auth_user SET disabled = FALSE;
ALTER TABLE auth_user ALTER COLUMN superuser SET NOT NULL;
ALTER TABLE auth_user ALTER COLUMN disabled SET NOT NULL;
```

#### `-- 5dee01ca98d3e19e2b1598ca54bab29c6293d02c` (2015-12-28)

```sql
ALTER TABLE auth_group ADD COLUMN register boolean;
UPDATE auth_group SET register = FALSE;
ALTER TABLE auth_group ALTER COLUMN register SET NOT NULL;
```
