from nextgisweb.env import gettext

from nextgisweb.spatial_ref_sys import SRSMixin


class SpatialLayerMixin(SRSMixin):
    def get_info(self):
        s = super()
        return (s.get_info() if hasattr(s, "get_info") else ()) + (
            (gettext("Spatial reference system"), self.srs.display_name),
        )
