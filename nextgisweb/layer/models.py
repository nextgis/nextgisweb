# -*- coding: utf-8 -*-
from ..spatial_ref_sys import SRSMixin
from .util import _


class SpatialLayerMixin(SRSMixin):

    def get_info(self):
        s = super(SpatialLayerMixin, self)
        return (s.get_info() if hasattr(s, 'get_info') else ()) + (
            (_("SRS identifier"), self.srs_id),
        )
