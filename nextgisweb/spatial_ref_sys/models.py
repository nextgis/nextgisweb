# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm
from sqlalchemy.ext.declarative import declared_attr

from osgeo import osr

from .. import db
from ..models import declarative_base

Base = declarative_base()

SRID_MAX = 998999     # PostGIS maximum srid (srs.id)
SRID_LOCAL = 990001   # First local srid (srs.id)


class SRS(Base):
    __tablename__ = 'srs'

    id_seq = db.Sequence(
        'srs_id_seq', metadata=Base.metadata,
        minvalue=SRID_LOCAL, maxvalue=SRID_MAX)

    id = sa.Column(
        sa.Integer, primary_key=True, autoincrement=False,
        server_default=id_seq.next_value())
    display_name = sa.Column(sa.Unicode, nullable=False)
    auth_name = sa.Column(sa.Unicode) # NULL auth_* used for
    auth_srid = sa.Column(sa.Integer) # custom local projection
    wkt = sa.Column(sa.Unicode, nullable=False)
    minx = sa.Column(sa.Float)
    miny = sa.Column(sa.Float)
    maxx = sa.Column(sa.Float)
    maxy = sa.Column(sa.Float)

    __table_args__ = (
        db.CheckConstraint(
            'id > 0 AND id <= %d' % SRID_MAX,
            name='srs_id_check'),
        db.CheckConstraint(
            '(auth_name IS NULL AND auth_srid IS NULL) '
            'OR (auth_name IS NOT NULL AND auth_srid IS NOT NULL)',
            name='srs_auth_check'),
        db.CheckConstraint(
            '(auth_name IS NULL AND auth_srid IS NULL) '
            'OR id < %d' % SRID_LOCAL,
            name='srs_id_auth_check'),
    )

    def as_osr(self):
        return osr.ImportFromEPSG(self.id)

    def tile_extent(self, tile):
        z, x, y = tile
        step = (self.maxx - self.minx) / (2 ** z)
        return (
            self.minx + x * step,
            self.maxy - (y + 1) * step,
            self.minx + (x + 1) * step,
            self.maxy - y * step,
        )


db.event.listen(SRS.__table__, 'after_create', db.DDL("""
    CREATE OR REPLACE FUNCTION srs_spatial_ref_sys_sync() RETURNS TRIGGER
    LANGUAGE 'plpgsql' AS $BODY$
    BEGIN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            -- Update existing spatial_ref_sys row
            UPDATE spatial_ref_sys SET
            auth_name = NEW.auth_name, auth_srid = NEW.auth_srid,
            srtext = NEW.wkt, proj4text = NULL
            WHERE srid = NEW.id;
            
            -- Insert if missing
            INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, srtext, proj4text)
            SELECT NEW.id, NEW.auth_name, NEW.auth_srid, NEW.wkt, NULL
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

"""), propagate=True)


db.event.listen(SRS.__table__, 'after_drop', db.DDL("""
DROP FUNCTION IF EXISTS srs_spatial_ref_sys_sync();
"""), propagate=True)


class SRSMixin(object):

    @declared_attr
    def srs_id(cls):
        return sa.Column(sa.Integer, sa.ForeignKey(SRS.id), nullable=False)

    @declared_attr
    def srs(cls):
        return orm.relationship('SRS', lazy='joined')
