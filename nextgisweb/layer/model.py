from nextgisweb.env import gettext

from nextgisweb.spatial_ref_sys import SRSMixin


class SpatialLayerMixin(SRSMixin):
    def get_info(self):
        s = super()
        result = s.get_info() if hasattr(s, "get_info") else ()
        if self.srs is not None:
            result += ((gettext("Spatial reference system"), self.srs.display_name),)
        return result
