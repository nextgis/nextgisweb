from __future__ import annotations

from typing import Literal

import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import UNSET, Struct
from msgspec import field as msgspec_field
from zope.interface import implementer

from nextgisweb.env import COMP_ID, Base, env, gettext, gettextf
from nextgisweb.lib import saext
from nextgisweb.lib.geometry import Geometry, Transformer

from nextgisweb.core import KindOfData
from nextgisweb.core.exception import ValidationError
from nextgisweb.core.storage import StorageEstimateResult, storage_estimate_hook
from nextgisweb.file_storage import FileObj
from nextgisweb.file_upload import FileUploadRef
from nextgisweb.file_upload.model import FileUpload
from nextgisweb.layer import IBboxLayer, SpatialLayerMixin
from nextgisweb.resource import (
    DataScope,
    Resource,
    ResourceGroup,
    ResourceScope,
    SAttribute,
    SColumn,
    Serializer,
    SRelationship,
)
from nextgisweb.spatial_ref_sys import SRS, WKT_EPSG_4326, SRSRef

from .component import PointCloudComponent
from .validation import inspect_copc, resolve_srs

Base.depends_on("resource")

PointCloudStyleMode = Literal[
    "elevation",
    "classification",
    "intensity",
    "rgb",
    "return_number",
]


class PointCloudData(KindOfData):
    identity = "point_cloud"
    display_name = gettext("Point clouds")


def estimate_point_cloud_data(resource: PointCloudLayer) -> int:
    return resource.fileobj.size if resource.fileobj is not None else 0


@implementer(IBboxLayer)
class PointCloudLayer(Resource, SpatialLayerMixin):
    identity = "point_cloud_layer"
    cls_display_name = gettext("Point cloud layer")

    __scope__ = DataScope

    fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=False)

    point_count = sa.Column(sa.BigInteger, nullable=False)
    point_format_id = sa.Column(sa.SmallInteger, nullable=False)

    minx = sa.Column(sa.Float, nullable=False)
    miny = sa.Column(sa.Float, nullable=False)
    maxx = sa.Column(sa.Float, nullable=False)
    maxy = sa.Column(sa.Float, nullable=False)
    zmin = sa.Column(sa.Float, nullable=False)
    zmax = sa.Column(sa.Float, nullable=False)

    has_rgb = sa.Column(sa.Boolean, nullable=False)
    has_intensity = sa.Column(sa.Boolean, nullable=False)
    has_classification = sa.Column(sa.Boolean, nullable=False)
    has_returns = sa.Column(sa.Boolean, nullable=False)

    fileobj = orm.relationship(FileObj, foreign_keys=fileobj_id, cascade="all")

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def load_file(self, file_upload: FileUpload, *, srs: SRS | None = None):
        info = inspect_copc(file_upload.data_path)
        srs = resolve_srs(info.crs, srs)

        old_size = estimate_point_cloud_data(self)
        self.fileobj = file_upload.to_fileobj()
        self.srs = srs
        self.point_count = info.point_count
        self.point_format_id = info.point_format_id
        self.minx, self.miny, self.maxx, self.maxy = info.minx, info.miny, info.maxx, info.maxy
        self.zmin, self.zmax = info.zmin, info.zmax
        self.has_rgb = info.has_rgb
        self.has_intensity = info.has_intensity
        self.has_classification = info.has_classification
        self.has_returns = info.has_returns

        if diff := estimate_point_cloud_data(self) - old_size:
            env.core.reserve_storage(
                COMP_ID,
                PointCloudData,
                value_data_volume=diff,
                resource=self,
            )

    def set_srs(self, srs: SRS):
        # Validate against the coordinate system of the stored file
        info = inspect_copc(self.fileobj.filename())
        self.srs = resolve_srs(info.crs, srs)

    @property
    def extent(self):
        box = Geometry.from_box(self.minx, self.miny, self.maxx, self.maxy)
        bounds = Transformer(self.srs.wkt, WKT_EPSG_4326).transform(box).bounds
        return dict(minLon=bounds[0], minLat=bounds[1], maxLon=bounds[2], maxLat=bounds[3])

    def get_info(self):
        return (
            *(s() if (s := getattr(super(), "get_info", None)) else ()),
            (gettext("Point count"), self.point_count),
            (gettext("Point format"), self.point_format_id),
        )


@storage_estimate_hook()
def storage_estimate(comp: PointCloudComponent, /) -> StorageEstimateResult:
    for resource in PointCloudLayer.query():
        yield PointCloudData, resource.id, estimate_point_cloud_data(resource)


class SourceAttr(SAttribute):
    def set(self, srlzr: Serializer, value: FileUploadRef, *, create: bool):
        srs = srlzr.data.srs
        srs = SRS.filter_by(id=srs.id).one() if srs is not UNSET else None
        srlzr.obj.load_file(value(), srs=srs)


class SrsAttr(SRelationship):
    def get(self, srlzr: Serializer) -> SRSRef:
        return SRSRef(id=srlzr.obj.srs_id)

    def set(self, srlzr: Serializer, value: SRSRef, *, create: bool):
        # Applied along with the source when both are specified
        if srlzr.data.source is not UNSET:
            return
        srlzr.obj.set_srs(SRS.filter_by(id=value.id).one())


class SrsProj4Attr(SAttribute):
    def get(self, srlzr: Serializer) -> str | None:
        srs = srlzr.obj.srs
        return srs.proj4 if srs is not None else None


class PointCloudLayerSerializer(Serializer, resource=PointCloudLayer):
    srs = SrsAttr(read=ResourceScope.read, write=DataScope.write, required=False)
    srs_proj4 = SrsProj4Attr(read=ResourceScope.read)

    source = SourceAttr(read=None, write=DataScope.write, required=True)

    point_count = SColumn(read=ResourceScope.read)
    point_format_id = SColumn(read=ResourceScope.read)

    minx = SColumn(read=ResourceScope.read)
    miny = SColumn(read=ResourceScope.read)
    maxx = SColumn(read=ResourceScope.read)
    maxy = SColumn(read=ResourceScope.read)
    zmin = SColumn(read=ResourceScope.read)
    zmax = SColumn(read=ResourceScope.read)

    has_rgb = SColumn(read=ResourceScope.read)
    has_intensity = SColumn(read=ResourceScope.read)
    has_classification = SColumn(read=ResourceScope.read)
    has_returns = SColumn(read=ResourceScope.read)


POINT_BUDGET_DEFAULT = 120000
POINT_BUDGET_MIN = 1000
POINT_BUDGET_MAX = 1000000


class PointCloudStyleClassificationColor(Struct, kw_only=True):
    code: int
    color: str


class PointCloudStyleConfig(Struct, kw_only=True):
    mode: PointCloudStyleMode = "elevation"
    point_size: float = 2.0
    opacity: int = 100
    point_budget: int = POINT_BUDGET_DEFAULT
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
        return isinstance(parent, PointCloudLayer)

    def validate_config(self, value: PointCloudStyleConfig):
        if value.point_size <= 0:
            raise ValidationError(message=gettext("Point size must be greater than zero."))
        if not 0 <= value.opacity <= 100:
            raise ValidationError(message=gettext("Opacity must be between 0 and 100."))
        if not POINT_BUDGET_MIN <= value.point_budget <= POINT_BUDGET_MAX:
            raise ValidationError(
                message=gettextf("Point budget must be between {min} and {max}.")(
                    min=POINT_BUDGET_MIN, max=POINT_BUDGET_MAX
                )
            )
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
