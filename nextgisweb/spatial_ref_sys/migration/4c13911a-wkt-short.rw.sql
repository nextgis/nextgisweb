/*** { "revision": "4c13911a" } ***/

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

ALTER TABLE srs DROP COLUMN wkt_short;
