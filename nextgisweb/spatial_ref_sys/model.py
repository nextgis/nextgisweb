from osgeo import gdal, osr
import sqlalchemy as sa
import sqlalchemy.orm as orm
from sqlalchemy.ext.declarative import declared_attr

from .. import db
from ..models import declarative_base

from .util import convert_to_proj

Base = declarative_base()

SRID_MAX = 998999     # PostGIS maximum srid (srs.id)
SRID_LOCAL = 990001   # First local srid (srs.id)

WKT_EPSG_4326 = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]'  # NOQA: E501
WKT_EPSG_3857 = 'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["X",EAST],AXIS["Y",NORTH],EXTENSION["PROJ4","+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs"],AUTHORITY["EPSG","3857"]]'  # NOQA: E501

BOUNDS_EPSG_4326 = (-180, -90, 180, 90)
BOUNDS_EPSG_3857 = (-20037508.34, -20037508.34, 20037508.34, 20037508.34)


class SRS(Base):
    __tablename__ = 'srs'

    id_seq = db.Sequence(
        'srs_id_seq', metadata=Base.metadata,
        start=SRID_LOCAL, minvalue=SRID_LOCAL, maxvalue=SRID_MAX)

    id = sa.Column(
        sa.Integer, id_seq, primary_key=True, autoincrement=False,
        server_default=id_seq.next_value())
    display_name = sa.Column(sa.Unicode, nullable=False)
    auth_name = sa.Column(sa.Unicode)  # NULL auth_* used for
    auth_srid = sa.Column(sa.Integer)  # custom local projection
    wkt = sa.Column(sa.Unicode, nullable=False)
    proj4 = sa.Column(sa.Unicode, nullable=False)
    minx = sa.Column(sa.Float)
    miny = sa.Column(sa.Float)
    maxx = sa.Column(sa.Float)
    maxy = sa.Column(sa.Float)
    catalog_id = sa.Column(sa.Integer, unique=True)

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

    def delete(selef):
        raise Exception()

    @db.validates('wkt')
    def _validate_wkt(self, key, value):
        self.proj4 = convert_to_proj(value)
        return value

    @property
    def is_geographic(self):
        return bool(self.to_osr().IsGeographic())

    @property
    def _zero_level_numtiles_x(self):
        return 2 if self.is_geographic else 1

    @property
    def _zero_level_numtiles_y(self):
        return 1

    def _tile_step_x(self, z):
        return (self.maxx - self.minx) / (2 ** z) / self._zero_level_numtiles_x

    def _tile_step_y(self, z):
        return (self.maxy - self.miny) / (2 ** z) / self._zero_level_numtiles_y

    def tile_extent(self, tile):
        z, x, y = tile

        return (
            self.minx + x * self._tile_step_x(z),
            self.maxy - (y + 1) * self._tile_step_y(z),
            self.minx + (x + 1) * self._tile_step_x(z),
            self.maxy - y * self._tile_step_y(z),
        )

    def tile_center(self, tile):
        extent = self.tile_extent(tile)
        return (
            (extent[0] + extent[2]) / 2,
            (extent[1] + extent[3]) / 2,
        )

    def _point_tilexy(self, px, py, ztile):
        return (
            (px - self.minx) / self._tile_step_x(ztile),
            (self.maxy - py) / self._tile_step_y(ztile)
        )

    def extent_tile_range(self, extent, ztile):
        xtile_min, ytile_max = self._point_tilexy(extent[0], extent[1], ztile)
        xtile_max, ytile_min = self._point_tilexy(extent[2], extent[3], ztile)

        E = 1e-6
        if xtile_min % 1 > 1 - E:
            xtile_min += 1
        if ytile_min % 1 > 1 - E:
            ytile_min += 1
        if xtile_max % 1 < E:
            xtile_max -= 1
        if ytile_max % 1 < E:
            ytile_max -= 1

        return [int(xtile_min), int(ytile_min), int(xtile_max), int(ytile_max)]

    def to_osr(self):
        sr = osr.SpatialReference()
        if sr.ImportFromWkt(self.wkt) != 0:
            raise ValueError(gdal.GetLastErrorMsg())
        return sr

    def __str__(self):
        return self.display_name

    @property
    def disabled(self):
        # EPSG:3857 and EPSG:4326 are special and cannot be changed or deleted.
        return self.id in (3857, 4326)


db.event.listen(SRS.__table__, 'after_create', db.DDL("""
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
