# -*- coding: utf-8 -*-
from ..spatial_ref_sys import SRSMixin


class SpatialLayerMixin(SRSMixin):

    def get_info(self):
        s = super(SpatialLayerMixin, self)
        return (s.get_info() if hasattr(s, 'get_info') else ()) + (
            (u"Система координат", self.srs_id),
        )
