from nextgisweb.env import _

from nextgisweb.spatial_ref_sys import SRSMixin


class SpatialLayerMixin(SRSMixin):
    def get_info(self):
        s = super()
        return (s.get_info() if hasattr(s, "get_info") else ()) + (
            (_("Spatial reference system"), self.srs.display_name),
        )
