# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from osgeo import osr

from ..models import Base


class SRS(Base):
    __tablename__ = 'srs'

    id = sa.Column(sa.Integer, primary_key=True)

    def as_osr(self):
        return osr.ImportFromEPSG(self.id)
