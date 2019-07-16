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
