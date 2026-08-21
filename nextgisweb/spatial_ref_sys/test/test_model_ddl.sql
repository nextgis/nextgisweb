/*** Table: srs ***/

CREATE TABLE srs (
    id integer DEFAULT nextval('srs_id_seq') NOT NULL,
    display_name character varying NOT NULL,
    auth_name character varying,
    auth_srid integer,
    wkt character varying NOT NULL,
    wkt_short character varying NOT NULL,
    proj4 character varying NOT NULL,
    minx double precision,
    miny double precision,
    maxx double precision,
    maxy double precision,
    catalog_id integer,
    PRIMARY KEY (id),
    CONSTRAINT srs_id_check CHECK (id > 0 AND id <= 998999),
    CONSTRAINT srs_auth_check CHECK ((
        auth_name IS NULL AND auth_srid IS NULL
    )
    OR (
        auth_name IS NOT NULL AND auth_srid IS NOT NULL
    )),
    CONSTRAINT srs_auth_unique UNIQUE (auth_name, auth_srid),
    UNIQUE (catalog_id)
);

COMMENT ON TABLE srs IS 'spatial_ref_sys';

CREATE OR REPLACE FUNCTION srs_spatial_ref_sys_sync() RETURNS TRIGGER
LANGUAGE 'plpgsql' AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update existing spatial_ref_sys row
        UPDATE spatial_ref_sys SET
            auth_name = NEW.auth_name,
            auth_srid = NEW.auth_srid,
            srtext = NEW.wkt_short,
            proj4text = NEW.proj4
        WHERE srid = NEW.id;

        -- Insert if missing
        INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text)
        SELECT NEW.id, NEW.auth_name, NEW.auth_srid, NEW.wkt_short, NEW.proj4
        WHERE NOT EXISTS(SELECT * FROM spatial_ref_sys WHERE srid = NEW.id);

        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        -- Delete existing row
        DELETE FROM spatial_ref_sys WHERE srid = OLD.id;
        RETURN OLD;
    END IF;
END $$;

TRUNCATE TABLE     spatial_ref_sys;

DROP TRIGGER IF EXISTS spatial_ref_sys ON srs;

CREATE TRIGGER spatial_ref_sys AFTER INSERT OR UPDATE OR DELETE
ON
srs
FOR EACH ROW
EXECUTE FUNCTION srs_spatial_ref_sys_sync();
