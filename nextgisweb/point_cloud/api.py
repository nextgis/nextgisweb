import os
from io import DEFAULT_BUFFER_SIZE
from typing import Annotated, Literal

from msgspec import UNSET, Struct, UnsetType
from pyramid.response import FileIter, FileResponse, Response

from nextgisweb.lib.apitype import StatusCode

from nextgisweb.core.exception import ValidationError
from nextgisweb.file_upload import FileUploadRef
from nextgisweb.resource import DataScope, ResourceFactory
from nextgisweb.spatial_ref_sys import SRS, SRSRef

from .model import PointCloud
from .validation import PointCloudExtent, validate_external_url, validate_upload

POINT_CLOUD_CONTENT_TYPE = "application/octet-stream"


class RangeFileWrapper(FileIter):
    def __init__(self, file, block_size=DEFAULT_BUFFER_SIZE, offset=0, length=0):
        super().__init__(file=file, block_size=block_size)
        self.file.seek(offset, os.SEEK_SET)
        self.remaining = length

    def __next__(self):
        if self.remaining <= 0:
            raise StopIteration()
        data = self.file.read(min(self.remaining, self.block_size))
        if not data:
            raise StopIteration()
        self.remaining -= len(data)
        return data


def _exception_message(exc: ValidationError) -> str:
    message = getattr(exc, "message", None)
    if message is None:
        return str(exc)
    return str(message)


class ValidateBody(Struct, kw_only=True):
    source_type: Literal["upload", "external_url"]
    file_upload: FileUploadRef | UnsetType = UNSET
    url: str | UnsetType = UNSET
    srs: SRSRef | UnsetType = UNSET


class ValidateResponse(Struct, kw_only=True):
    is_valid: bool
    reason: str | None = None
    point_count: int | None = None
    point_format_id: int | None = None
    epsg: int | None = None
    wkt: str | None = None
    srs_required: bool = False
    extent: PointCloudExtent | None = None
    minx: float | None = None
    miny: float | None = None
    maxx: float | None = None
    maxy: float | None = None
    zmin: float | None = None
    zmax: float | None = None
    has_rgb: bool = False
    has_intensity: bool = False
    has_classification: bool = False
    has_returns: bool = False


def validate(request, *, body: ValidateBody) -> Annotated[ValidateResponse, StatusCode(200)]:
    srs = SRS.filter_by(id=body.srs.id).one() if body.srs is not UNSET else None

    try:
        if body.source_type == "upload":
            if body.file_upload is UNSET:
                raise ValidationError(message="file_upload is required.")
            result = validate_upload(body.file_upload(), srs=srs)
        else:
            if body.url is UNSET:
                raise ValidationError(message="url is required.")
            result = validate_external_url(body.url, srs=srs)
    except ValidationError as exc:
        return ValidateResponse(
            is_valid=False,
            reason=_exception_message(exc),
        )

    return ValidateResponse(
        is_valid=True,
        point_count=result.point_count,
        point_format_id=result.point_format_id,
        epsg=result.epsg,
        wkt=result.wkt,
        srs_required=result.srs_required,
        extent=result.extent,
        minx=result.minx,
        miny=result.miny,
        maxx=result.maxx,
        maxy=result.maxy,
        zmin=result.zmin,
        zmax=result.zmax,
        has_rgb=result.has_rgb,
        has_intensity=result.has_intensity,
        has_classification=result.has_classification,
        has_returns=result.has_returns,
    )


def content_head(resource: PointCloud, request) -> Response:
    request.resource_permission(DataScope.read)

    if resource.fileobj is None:
        raise ValidationError(message="Only uploaded point clouds can be proxied.")

    filename = resource.fileobj.filename()
    return Response(
        accept_ranges="bytes",
        content_length=filename.stat().st_size,
        content_type=POINT_CLOUD_CONTENT_TYPE,
    )


def content_get(resource: PointCloud, request) -> Response:
    request.resource_permission(DataScope.read)

    if resource.fileobj is None:
        raise ValidationError(message="Only uploaded point clouds can be proxied.")

    filename = resource.fileobj.filename()
    file_size = filename.stat().st_size

    if request.range is None:
        return FileResponse(
            filename,
            request=request,
            content_type=POINT_CLOUD_CONTENT_TYPE,
        )

    content_range = request.range.content_range(file_size)
    if content_range is None:
        raise ValidationError(message="Requested range can not be read.")

    content_length = content_range.stop - content_range.start
    response = Response(
        status_code=206,
        content_range=content_range,
        content_type=POINT_CLOUD_CONTENT_TYPE,
        accept_ranges="bytes",
    )
    response.app_iter = RangeFileWrapper(
        open(filename, "rb"),
        offset=content_range.start,
        length=content_length,
    )
    response.content_length = content_length
    return response


def setup_pyramid(comp, config):
    config.add_route(
        "point_cloud.validate",
        "/api/component/point_cloud/validate",
        post=validate,
    )

    point_cloud_factory = ResourceFactory(context=PointCloud)
    config.add_route(
        "point_cloud.content",
        "/api/resource/{id}/point_cloud/content",
        factory=point_cloud_factory,
        head=content_head,
        get=content_get,
    )
