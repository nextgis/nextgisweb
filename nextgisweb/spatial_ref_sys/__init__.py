# -*- coding: utf-8 -*-

from ..component import Component

from .models import SRS


@Component.registry.register
class SpatialRefSysComponent(Component):
    identity = 'spatial_ref_sys'

    @classmethod
    def initialize_db(cls, DBSession):
        srs_list = (
            SRS(id=4326),
            SRS(id=3857),
        )

        for o in srs_list:
            DBSession.add(o)
