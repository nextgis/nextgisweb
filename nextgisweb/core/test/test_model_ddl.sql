/*** Table: core_cstate ***/

CREATE TABLE core_cstate (
    component character varying NOT NULL,
    heads character varying NOT NULL,
    PRIMARY KEY (component)
);

COMMENT ON TABLE core_cstate IS 'core';

/*** Table: core_migration ***/

CREATE TABLE core_migration (
    component character varying NOT NULL,
    revision character varying NOT NULL,
    PRIMARY KEY (component, revision)
);

COMMENT ON TABLE core_migration IS 'core';

/*** Table: core_storage_stat_delta ***/

CREATE TABLE core_storage_stat_delta (
    tstamp timestamp without time zone NOT NULL,
    component character varying NOT NULL,
    kind_of_data character varying NOT NULL,
    resource_id integer,
    value_data_volume bigint
);

COMMENT ON TABLE core_storage_stat_delta IS 'core';

CREATE INDEX ix_core_storage_stat_delta_resource_id ON core_storage_stat_delta(resource_id);

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

CREATE TRIGGER after_insert AFTER INSERT
ON
core_storage_stat_delta
FOR EACH ROW
EXECUTE FUNCTION core_storage_stat_delta_after_insert();

/*** Table: core_storage_stat_delta_total ***/

CREATE TABLE core_storage_stat_delta_total (
    tstamp timestamp without time zone NOT NULL,
    kind_of_data character varying NOT NULL,
    value_data_volume bigint,
    PRIMARY KEY (kind_of_data)
);

COMMENT ON TABLE core_storage_stat_delta_total IS 'core';

/*** Table: core_storage_stat_dimension ***/

CREATE TABLE core_storage_stat_dimension (
    tstamp timestamp without time zone NOT NULL,
    component character varying NOT NULL,
    kind_of_data character varying NOT NULL,
    resource_id integer,
    value_data_volume bigint
);

COMMENT ON TABLE core_storage_stat_dimension IS 'core';

CREATE INDEX ix_core_storage_stat_dimension_resource_id ON core_storage_stat_dimension(resource_id);

/*** Table: core_storage_stat_dimension_total ***/

CREATE TABLE core_storage_stat_dimension_total (
    tstamp timestamp without time zone NOT NULL,
    kind_of_data character varying NOT NULL,
    value_data_volume bigint,
    PRIMARY KEY (kind_of_data)
);

COMMENT ON TABLE core_storage_stat_dimension_total IS 'core';

/*** Table: setting ***/

CREATE TABLE setting (
    component character varying NOT NULL,
    name character varying NOT NULL,
    value jsonb NOT NULL,
    PRIMARY KEY (component, name)
);

COMMENT ON TABLE setting IS 'core';
