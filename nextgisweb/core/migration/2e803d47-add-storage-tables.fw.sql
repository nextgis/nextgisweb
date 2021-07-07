/*** {
    "revision": "2e803d47", "parents": ["2e8a9c51"],
    "date": "2021-05-11T03:22:14",
    "message": "Add storage tables"
} ***/

CREATE TABLE core_storage_stat_delta
(
    tstamp timestamp without time zone NOT NULL,
    component character varying,
    kind_of_data character varying,
    resource_id integer,
    value_data_volume integer
);

CREATE TABLE core_storage_stat_delta_total
(
    tstamp timestamp without time zone NOT NULL,
    kind_of_data character varying,
    value_data_volume integer
);

CREATE TABLE core_storage_stat_dimension
(
    tstamp timestamp without time zone NOT NULL,
    component character varying,
    kind_of_data character varying,
    resource_id integer,
    value_data_volume integer
);

CREATE TABLE core_storage_stat_dimension_total
(
    tstamp timestamp without time zone NOT NULL,
    kind_of_data character varying,
    value_data_volume integer
);

CREATE FUNCTION core_storage_stat_delta_after_insert() RETURNS trigger
LANGUAGE 'plpgsql' AS $BODY$
BEGIN
    PERFORM pg_advisory_xact_lock('core_storage_stat_delta_total'::regclass::int, 0);

    UPDATE core_storage_stat_delta_total
    SET tstamp = NEW.tstamp, value_data_volume = value_data_volume + NEW.value_data_volume
    WHERE kind_of_data = NEW.kind_of_data;

    IF NOT found THEN
        INSERT INTO core_storage_stat_delta_total (tstamp, kind_of_data, value_data_volume)
        VALUES (NEW.tstamp, NEW.kind_of_data, NEW.value_data_volume);
    END IF;

    UPDATE core_storage_stat_delta_total
    SET tstamp = NEW.tstamp, value_data_volume = value_data_volume + NEW.value_data_volume
    WHERE kind_of_data = '';

    IF NOT found THEN
        INSERT INTO core_storage_stat_delta_total (tstamp, kind_of_data, value_data_volume)
        VALUES (NEW.tstamp, '', NEW.value_data_volume);
    END IF;

    RETURN NEW;
END
$BODY$;

CREATE TRIGGER after_insert AFTER INSERT ON core_storage_stat_delta
FOR EACH ROW EXECUTE PROCEDURE core_storage_stat_delta_after_insert();
