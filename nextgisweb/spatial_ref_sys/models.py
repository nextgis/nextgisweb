# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm
from sqlalchemy.ext.declarative import declared_attr

from osgeo import osr

from ..models import declarative_base

Base = declarative_base()


class SRS(Base):
    __tablename__ = 'srs'

    id = sa.Column(sa.Integer, primary_key=True)
    display_name = sa.Column(sa.Unicode, nullable=False)
    minx = sa.Column(sa.Float)
    miny = sa.Column(sa.Float)
    maxx = sa.Column(sa.Float)
    maxy = sa.Column(sa.Float)

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


class SRSMixin(object):

    @declared_attr
    def srs_id(cls):
        return sa.Column(sa.Integer, sa.ForeignKey(SRS.id), nullable=False)

    @declared_attr
    def srs(cls):
        return orm.relationship('SRS', lazy='joined')
