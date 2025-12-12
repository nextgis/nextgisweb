from nextgisweb.env import COMP_ID, gettext

from .base import (
    IdentificationCategory,
    MiscellaneousCategory,
    PanelCategory,
    ToolCategory,
    WebMapOption,
)


class IdentificationAttributesOption(WebMapOption):
    name = "identification_attributes"
    label = gettext("Feature attributes")
    category = IdentificationCategory

    @classmethod
    def default(cls):
        return cls.csetting("identify_attributes")


class IdentificationGeometryOption(WebMapOption):
    name = "identification_geometry"
    label = gettext("Geometry info")
    category = IdentificationCategory

    @classmethod
    def default(cls):
        return cls.csetting("show_geometry_info")


class HmuxOption(WebMapOption):
    name = "hmux"
    label = gettext("Request multiplexing")
    category = MiscellaneousCategory

    @classmethod
    def default(cls):
        return False
