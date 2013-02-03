# -*- coding: utf-8 -*-

from ..component import Component

from .models import SRS, SRSMixin


@Component.registry.register
class SpatialRefSysComponent(Component):
    identity = 'spatial_ref_sys'

    def initialize_db(self):
        DBSession = self.env.core.DBSession
        SRS = self.SRS

        srs_list = (
            # TODO: Закомментировано до лучших времен
            # SRS(id=4326, display_name="WGS 84 / Lon-lat (EPSG:4326)"),
            SRS(id=3857, display_name="WGS 84 / Pseudo-Mercator (EPSG:3857)"),
        )

        for o in srs_list:
            DBSession.add(o)

    def initialize(self):
        self.SRS = SRS

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
