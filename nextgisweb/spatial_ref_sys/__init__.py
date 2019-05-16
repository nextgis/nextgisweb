# -*- coding: utf-8 -*-
from sqlalchemy.orm.exc import NoResultFound

from ..component import Component

from .models import Base, SRS, SRSMixin

__all__ = ['SpatialRefSysComponent', 'SRS', 'SRSMixin']


class SpatialRefSysComponent(Component):
    identity = 'spatial_ref_sys'
    metadata = Base.metadata

    def initialize_db(self):
        srs_list = (
            SRS(
                id=4326,
                display_name=u"WGS 84 / Lon-lat (EPSG:4326)",
                auth_name="EPSG", auth_srid=4326,
                proj4text="+proj=longlat +datum=WGS84 +no_defs",
                minx=-180, miny=-90,
                maxx=180, maxy=90
            ),
            SRS(
                id=3857,
                display_name=u"WGS 84 / Pseudo-Mercator (EPSG:3857)",
                auth_name="EPSG", auth_srid=3857,
                proj4text="+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs",
                minx=-20037508.34, miny=-20037508.34,
                maxx=20037508.34, maxy=20037508.34
            ),
        )

        for srs in srs_list:
            try:
                SRS.filter_by(id=srs.id).one()
            except NoResultFound:
                srs.persist()

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)

