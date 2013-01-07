# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm
from sqlalchemy.ext.declarative import declared_attr

from osgeo import osr

from ..models import Base


class SRS(Base):
    __tablename__ = 'srs'

    id = sa.Column(sa.Integer, primary_key=True)

    def as_osr(self):
        return osr.ImportFromEPSG(self.id)


class SRSMixin(object):

    @declared_attr
    def srs_id(cls):
        return sa.Column(sa.Integer, sa.ForeignKey(SRS.id), nullable=False)

    @declared_attr
    def srs(cls):
        return orm.relationship('SRS')
