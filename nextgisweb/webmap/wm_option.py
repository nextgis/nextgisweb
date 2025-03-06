from nextgisweb.env import gettext

from .webmap_option import WebMapOption


class IdentificationGeometry(WebMapOption):
    name = "indentification_geometry"
    label = gettext("Show geometry info")
    default = False
    order = 50
