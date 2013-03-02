# -*- coding: utf-8 -*-
from sqlalchemy.orm.exc import NoResultFound

from ..component import Component

from .models import SRS, SRSMixin


@Component.registry.register
class SpatialRefSysComponent(Component):
    identity = 'spatial_ref_sys'

    def initialize_db(self):
        SRS = self.SRS

        srs_list = (
            # TODO: Закомментировано до лучших времен
            # SRS(id=4326, display_name="WGS 84 / Lon-lat (EPSG:4326)"),
            SRS(id=3857, display_name="WGS 84 / Pseudo-Mercator (EPSG:3857)"),
        )

        for srs in srs_list:
            try:
                SRS.filter_by(id=srs.id).one()
            except NoResultFound:
                srs.persist()

    def initialize(self):
        self.SRS = SRS

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
