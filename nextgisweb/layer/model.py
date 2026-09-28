from nextgisweb.env import gettext

from nextgisweb.spatial_ref_sys import SRSMixin


class SpatialLayerMixin(SRSMixin):
    __abstract__ = True

    def get_info(self):
        result = s() if (s := getattr(super(), "get_info", None)) else ()
        if self.srs is not None:
            result += ((gettext("Spatial reference system"), self.srs.display_name),)
        return result
