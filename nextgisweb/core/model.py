import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
import sqlalchemy.event as sa_event

from nextgisweb.env import Base


class CState(Base):
    __tablename__ = "core_cstate"

    component = sa.Column(sa.Unicode, primary_key=True)
    heads = sa.Column(sa.Unicode, nullable=False)


class Migration(Base):
    __tablename__ = "core_migration"

    component = sa.Column(sa.Unicode, primary_key=True)
    revision = sa.Column(sa.Unicode, primary_key=True)


class Setting(Base):
    __tablename__ = "setting"

    component = sa.Column(sa.Unicode, primary_key=True)
    name = sa.Column(sa.Unicode, primary_key=True)
    value = sa.Column(sa_pg.JSONB, nullable=False)


storage_stat_dimension = sa.Table(
    "core_storage_stat_dimension",
    Base.metadata,
    sa.Column("tstamp", sa.TIMESTAMP, nullable=False),
    sa.Column("component", sa.Unicode, nullable=False),
    sa.Column("kind_of_data", sa.Unicode, nullable=False),
    sa.Column("resource_id", sa.Integer, index=True),
    sa.Column("value_data_volume", sa.BigInteger),
)


storage_stat_dimension_total = sa.Table(
    "core_storage_stat_dimension_total",
    Base.metadata,
    sa.Column("tstamp", sa.TIMESTAMP, nullable=False),
    sa.Column("kind_of_data", sa.Unicode, primary_key=True),
    sa.Column("value_data_volume", sa.BigInteger),
)


storage_stat_delta = sa.Table(
    "core_storage_stat_delta",
    Base.metadata,
    sa.Column("tstamp", sa.TIMESTAMP, nullable=False),
    sa.Column("component", sa.Unicode, nullable=False),
    sa.Column("kind_of_data", sa.Unicode, nullable=False),
    sa.Column("resource_id", sa.Integer, index=True),
    sa.Column("value_data_volume", sa.BigInteger),
)


storage_stat_delta_total = sa.Table(
    "core_storage_stat_delta_total",
    Base.metadata,
    sa.Column("tstamp", sa.TIMESTAMP, nullable=False),
    sa.Column("kind_of_data", sa.Unicode, primary_key=True),
    sa.Column("value_data_volume", sa.BigInteger),
)


sa_event.listen(
    storage_stat_delta,
    "after_create",
    # fmt: off
    sa.DDL("""
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
    """),
    # fmt: on
    propagate=True,
)


sa_event.listen(
    storage_stat_delta,
    "after_drop",
    sa.DDL("DROP FUNCTION core_storage_stat_delta_after_insert();"),
    propagate=True,
)
