from __future__ import annotations

from typing import Literal

import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import UNSET
from osgeo import ogr, osr
from zope.interface import implementer

from nextgisweb.env import COMP_ID, Base, env, gettext
from nextgisweb.lib import saext
from nextgisweb.lib.osrhelper import sr_from_epsg

from nextgisweb.core import KindOfData
from nextgisweb.core.exception import ValidationError
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
from nextgisweb.spatial_ref_sys import SRS

from .validation import PointCloudValidationResult, validate_external_url, validate_upload

Base.depends_on("resource")

PointCloudSourceType = Literal["upload", "external_url"]


class PointCloudData(KindOfData):
    identity = "point_cloud"
    display_name = gettext("Point clouds")


def estimate_point_cloud_data(resource: "PointCloud") -> int:
    return resource.fileobj.size if resource.fileobj is not None else 0


@implementer(IBboxLayer)
class PointCloud(Resource, SpatialLayerMixin):
    identity = "point_cloud"
    cls_display_name = gettext("Point cloud")

    __scope__ = DataScope

    fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=True)
    source_type = sa.Column(saext.Enum("upload", "external_url"), nullable=False, default="upload")
    external_url = sa.Column(sa.Unicode, nullable=True)

    point_count = sa.Column(sa.BigInteger, nullable=False, default=0)
    point_format_id = sa.Column(sa.SmallInteger, nullable=False, default=0)
    epsg = sa.Column(sa.Integer, nullable=True)
    wkt = sa.Column(sa.Unicode, nullable=True)

    minx = sa.Column(sa.Float, nullable=False, default=0)
    miny = sa.Column(sa.Float, nullable=False, default=0)
    maxx = sa.Column(sa.Float, nullable=False, default=0)
    maxy = sa.Column(sa.Float, nullable=False, default=0)
    zmin = sa.Column(sa.Float, nullable=False, default=0)
    zmax = sa.Column(sa.Float, nullable=False, default=0)

    has_rgb = sa.Column(sa.Boolean, nullable=False, default=False)
    has_intensity = sa.Column(sa.Boolean, nullable=False, default=False)
    has_classification = sa.Column(sa.Boolean, nullable=False, default=False)
    has_returns = sa.Column(sa.Boolean, nullable=False, default=False)

    fileobj = orm.relationship(FileObj, foreign_keys=fileobj_id, cascade="all")

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def _reserve_storage_delta(self, old_size: int):
        new_size = estimate_point_cloud_data(self)
        diff = new_size - old_size
        if diff:
            env.core.reserve_storage(
                COMP_ID,
                PointCloudData,
                value_data_volume=diff,
                resource=self,
            )

    def _resolve_srs(
        self, validation: PointCloudValidationResult, explicit_srs: SRS | None
    ) -> SRS:
        if explicit_srs is not None:
            return explicit_srs

        if validation.epsg is not None:
            srs = SRS.filter_by(id=validation.epsg).one_or_none()
            if srs is None:
                srs = SRS.filter_by(auth_name="EPSG", auth_srid=validation.epsg).one_or_none()
            if srs is not None:
                return srs

        if validation.wkt:
            srs = SRS.filter_by(wkt=validation.wkt).one_or_none()
            if srs is not None:
                return srs

        raise ValidationError(
            message=gettext("Spatial reference system could not be detected. Specify it manually.")
        )

    def _apply_validation(self, validation: PointCloudValidationResult, srs: SRS):
        self.srs = srs
        self.point_count = validation.point_count
        self.point_format_id = validation.point_format_id
        self.epsg = validation.epsg
        self.wkt = validation.wkt
        self.minx = validation.minx
        self.miny = validation.miny
        self.maxx = validation.maxx
        self.maxy = validation.maxy
        self.zmin = validation.zmin
        self.zmax = validation.zmax
        self.has_rgb = validation.has_rgb
        self.has_intensity = validation.has_intensity
        self.has_classification = validation.has_classification
        self.has_returns = validation.has_returns

    def load_upload(self, file_upload: FileUpload, *, srs: SRS | None = None):
        validation = validate_upload(file_upload, srs=srs)
        resolved_srs = self._resolve_srs(validation, srs)
        old_size = estimate_point_cloud_data(self)
        self.fileobj = file_upload.to_fileobj(component="point_cloud")
        self.external_url = None
        self.source_type = "upload"
        self._apply_validation(validation, resolved_srs)
        self._reserve_storage_delta(old_size)

    def load_external_url(self, url: str, *, srs: SRS | None = None):
        validation = validate_external_url(url, srs=srs)
        resolved_srs = self._resolve_srs(validation, srs)
        old_size = estimate_point_cloud_data(self)
        self.fileobj = None
        self.external_url = url
        self.source_type = "external_url"
        self._apply_validation(validation, resolved_srs)
        self._reserve_storage_delta(old_size)

    @property
    def extent(self):
        src_sr = self.srs.to_osr()
        dst_sr = sr_from_epsg(4326)
        ct = osr.CoordinateTransformation(src_sr, dst_sr)

        def transform_point(x: float, y: float) -> tuple[float, float]:
            point = ogr.Geometry(ogr.wkbPoint)
            point.AddPoint(x, y)
            point.Transform(ct)
            return point.GetX(), point.GetY()

        corners = (
            transform_point(self.minx, self.miny),
            transform_point(self.minx, self.maxy),
            transform_point(self.maxx, self.miny),
            transform_point(self.maxx, self.maxy),
        )
        xs = [c[0] for c in corners]
        ys = [c[1] for c in corners]
        return dict(minLon=min(xs), minLat=min(ys), maxLon=max(xs), maxLat=max(ys))

    def get_info(self):
        s = super()
        source = gettext("Upload") if self.source_type == "upload" else gettext("External URL")
        info = (
            (gettext("Source type"), source),
            (gettext("Point count"), self.point_count),
            (gettext("Point format"), self.point_format_id),
        )
        if self.epsg is not None:
            info += ((gettext("EPSG"), self.epsg),)
        return (s.get_info() if hasattr(s, "get_info") else ()) + info


class SourceAttr(SAttribute):
    def set(self, srlzr: Serializer, value: FileUploadRef, *, create: bool):
        srs = srlzr.obj.srs if srlzr.data.srs is not UNSET else None
        srlzr.obj.load_upload(value(), srs=srs)


class ExternalURLAttr(SAttribute):
    def get(self, srlzr: Serializer) -> str | None:
        return srlzr.obj.external_url

    def set(self, srlzr: Serializer, value: str | None, *, create: bool):
        if value is None:
            srlzr.obj.external_url = None
            return

        value = value.strip()
        if not value:
            raise ValidationError(message=gettext("URL must not be empty."))

        srs = srlzr.obj.srs if srlzr.data.srs is not UNSET else None
        srlzr.obj.load_external_url(value, srs=srs)


class PointCloudSerializer(Serializer, resource=PointCloud):
    srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update, required=False)

    source_type = SColumn(read=ResourceScope.read)
    external_url = ExternalURLAttr(read=ResourceScope.read, write=DataScope.write)
    source = SourceAttr(read=None, write=DataScope.write, required=False)

    point_count = SColumn(read=ResourceScope.read)
    point_format_id = SColumn(read=ResourceScope.read)
    epsg = SColumn(read=ResourceScope.read)
    wkt = SColumn(read=ResourceScope.read)

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

    def deserialize(self) -> None:
        if self.obj.id is None:
            has_upload = self.data.source is not UNSET
            has_url = self.data.external_url is not UNSET
            if has_upload and has_url:
                raise ValidationError(
                    message=gettext(
                        "Specify either an uploaded file or an external URL, not both."
                    )
                )
        super().deserialize()

        if self.obj.id is None and self.obj.fileobj is None and self.obj.external_url is None:
            raise ValidationError(message=gettext("Point cloud source must be provided."))
