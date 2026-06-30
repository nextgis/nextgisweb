from __future__ import annotations

from typing import Literal

import sqlalchemy as sa
from msgspec import Struct
from msgspec import field as msgspec_field

from nextgisweb.env import gettext
from nextgisweb.lib import saext

from nextgisweb.core.exception import ValidationError
from nextgisweb.resource import DataScope, Resource, ResourceScope, SAttribute, Serializer

PointCloudStyleMode = Literal[
    "elevation",
    "classification",
    "intensity",
    "rgb",
    "return_number",
]


class PointCloudStyleClassificationColor(Struct, kw_only=True):
    code: int
    color: str


class PointCloudStyleConfig(Struct, kw_only=True):
    mode: PointCloudStyleMode = "elevation"
    point_size: float = 2.0
    opacity: int = 100
    use_percentile_clip: bool = True
    elevation_min_percent: float = 2.0
    elevation_max_percent: float = 98.0
    ramp_start_color: str = "#2b83ba"
    ramp_end_color: str = "#fdae61"
    intensity_modulation: bool = False
    classification_colors: list[PointCloudStyleClassificationColor] = msgspec_field(
        default_factory=list
    )


class PointCloudStyle(Resource):
    identity = "point_cloud_style"
    cls_display_name = gettext("Point cloud style")

    __scope__ = DataScope

    point_cloud_style_value = sa.Column(
        saext.Msgspec(PointCloudStyleConfig),
        nullable=False,
        default=PointCloudStyleConfig,
    )

    @classmethod
    def check_parent(cls, parent):
        return parent.cls == "point_cloud"

    def validate_config(self, value: PointCloudStyleConfig):
        if value.point_size <= 0:
            raise ValidationError(message=gettext("Point size must be greater than zero."))
        if not 0 <= value.opacity <= 100:
            raise ValidationError(message=gettext("Opacity must be between 0 and 100."))
        if not 0 <= value.elevation_min_percent <= 100:
            raise ValidationError(
                message=gettext("Minimum elevation percentile must be between 0 and 100.")
            )
        if not 0 <= value.elevation_max_percent <= 100:
            raise ValidationError(
                message=gettext("Maximum elevation percentile must be between 0 and 100.")
            )
        if value.elevation_min_percent >= value.elevation_max_percent:
            raise ValidationError(
                message=gettext(
                    "Minimum elevation percentile must be less than maximum percentile."
                )
            )

        parent = self.parent
        if value.mode == "rgb" and not parent.has_rgb:
            raise ValidationError(
                message=gettext("RGB styling is available only for point clouds with RGB data.")
            )
        if value.mode == "classification" and not parent.has_classification:
            raise ValidationError(
                message=gettext(
                    "Classification styling is available only when classification data is present."
                )
            )
        if value.mode == "intensity" and not parent.has_intensity:
            raise ValidationError(
                message=gettext(
                    "Intensity styling is available only when intensity data is present."
                )
            )
        if value.mode == "return_number" and not parent.has_returns:
            raise ValidationError(
                message=gettext(
                    "Return number styling is available only when return information is present."
                )
            )

    def get_info(self):
        s = super()
        return (s.get_info() if hasattr(s, "get_info") else ()) + (
            (gettext("Mode"), self.point_cloud_style_value.mode),
        )


DataScope.read.require(DataScope.read, attr="parent", cls=PointCloudStyle)


class ValueAttr(SAttribute):
    def get(self, srlzr: Serializer) -> PointCloudStyleConfig:
        return srlzr.obj.point_cloud_style_value

    def set(self, srlzr: Serializer, value: PointCloudStyleConfig, *, create: bool):
        srlzr.obj.validate_config(value)
        srlzr.obj.point_cloud_style_value = value


class PointCloudStyleSerializer(Serializer, resource=PointCloudStyle):
    value = ValueAttr(read=ResourceScope.read, write=ResourceScope.update)
