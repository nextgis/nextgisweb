/*** {
    "revision": "4c13911a", "parents": ["371c894c"],
    "date": "2025-05-27T01:36:17",
    "message": "WKT short"
} ***/

ALTER TABLE srs DISABLE TRIGGER spatial_ref_sys;

ALTER TABLE srs ADD COLUMN wkt_short character varying;
UPDATE srs SET wkt_short = wkt;
ALTER TABLE srs ALTER COLUMN wkt_short SET NOT NULL;

CREATE OR REPLACE FUNCTION srs_spatial_ref_sys_sync() RETURNS TRIGGER
LANGUAGE 'plpgsql' AS $BODY$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update existing spatial_ref_sys row
        UPDATE spatial_ref_sys SET
        auth_name = NEW.auth_name, auth_srid = NEW.auth_srid,
        srtext = NEW.wkt_short, proj4text = NEW.proj4
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

END
$BODY$;

ALTER TABLE srs ENABLE TRIGGER spatial_ref_sys;
