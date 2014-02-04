# -*- coding: utf-8 -*-
from sqlalchemy.orm.exc import NoResultFound

from ..component import Component

from .models import Base, SRS, SRSMixin

__all__ = ['SpatialRefSysComponent', 'SRS', 'SRSMixin']


@Component.registry.register
class SpatialRefSysComponent(Component):
    identity = 'spatial_ref_sys'
    metadata = Base.metadata

    def initialize_db(self):
        srs_list = (
            # TODO: Закомментировано до лучших времен
            # SRS(id=4326, display_name="WGS 84 / Lon-lat (EPSG:4326)"),
            SRS(
                id=3857,
                display_name=u"WGS 84 / Pseudo-Mercator (EPSG:3857)",
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
