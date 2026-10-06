from __future__ import annotations

import sqlalchemy as sa
from msgspec import UNSET
from sqlalchemy.orm import Mapped, mapped_column, relationship
from zope.interface import implementer

from nextgisweb.env import COMP_ID, Base, gettext, inject
from nextgisweb.lib.geometry import Geometry, Transformer

from nextgisweb.core import CoreComponent, KindOfData
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


class PointCloudData(KindOfData):
    identity = "point_cloud"
    display_name = gettext("Point clouds")


def estimate_point_cloud_data(resource: PointCloudLayer) -> int:
    return resource.fileobj.size if resource.fileobj is not None else 0


@implementer(IBboxLayer)
class PointCloudLayer(SpatialLayerMixin, Resource):
    identity = "point_cloud_layer"
    cls_display_name = gettext("Point cloud layer")

    __scope__ = DataScope

    fileobj_id: Mapped[int] = mapped_column(sa.ForeignKey(FileObj.id), nullable=False)

    point_count: Mapped[int] = mapped_column(sa.BigInteger, nullable=False)
    point_format_id: Mapped[int] = mapped_column(sa.SmallInteger, nullable=False)

    minx: Mapped[float] = mapped_column(sa.Float, nullable=False)
    miny: Mapped[float] = mapped_column(sa.Float, nullable=False)
    maxx: Mapped[float] = mapped_column(sa.Float, nullable=False)
    maxy: Mapped[float] = mapped_column(sa.Float, nullable=False)
    zmin: Mapped[float] = mapped_column(sa.Float, nullable=False)
    zmax: Mapped[float] = mapped_column(sa.Float, nullable=False)

    has_rgb: Mapped[bool] = mapped_column(sa.Boolean, nullable=False)
    has_intensity: Mapped[bool] = mapped_column(sa.Boolean, nullable=False)
    has_classification: Mapped[bool] = mapped_column(sa.Boolean, nullable=False)
    has_returns: Mapped[bool] = mapped_column(sa.Boolean, nullable=False)

    # Meters per unit of Z coordinates as defined by the file CRS, NULL means
    # Z coordinates are in units of the horizontal CRS
    z_unit_factor: Mapped[float | None] = mapped_column(sa.Float)

    # Upper bound of RGB channel values: 255 or 65535, NULL without RGB
    rgb_max: Mapped[int | None] = mapped_column(sa.Integer)

    fileobj: Mapped[FileObj] = relationship(foreign_keys=[fileobj_id], cascade="all")

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    @inject()
    def load_file(
        self,
        file_upload: FileUpload,
        *,
        srs: SRS | None = None,
        core: CoreComponent = inject.arg(),
    ):
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
        self.z_unit_factor = info.crs.z_unit_factor if info.crs is not None else None
        self.rgb_max = info.rgb_max

        if diff := estimate_point_cloud_data(self) - old_size:
            core.reserve_storage(
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


class ZScaleAttr(SAttribute):
    """Multiplier converting Z coordinates to horizontal CRS units"""

    def get(self, srlzr: Serializer) -> float:
        sr = srlzr.obj.srs.to_osr()
        if sr.IsGeographic():
            # Horizontal units are angular, nothing to convert to
            return 1.0
        xy_factor = sr.GetLinearUnits()
        z_factor = srlzr.obj.z_unit_factor
        return (z_factor if z_factor is not None else xy_factor) / xy_factor


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
    rgb_max = SColumn(read=ResourceScope.read)

    z_unit_factor = SColumn(read=ResourceScope.read)
    z_scale = ZScaleAttr(read=ResourceScope.read)
