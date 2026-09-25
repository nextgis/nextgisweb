from pathlib import Path

from msgspec import Struct
from pyramid.response import FileResponse, Response

from nextgisweb.core.exception import ValidationError
from nextgisweb.file_upload import FileUploadRef
from nextgisweb.raster_layer.api import RangeFileWrapper
from nextgisweb.resource import DataScope, ResourceFactory

from .model import PointCloudLayer
from .validation import find_srs_candidates, inspect_copc

POINT_CLOUD_CONTENT_TYPE = "application/octet-stream"


class InspectCRS(Struct, kw_only=True):
    display_name: str
    auth: str | None
    vertical_display_name: str | None
    vertical_auth: str | None


class InspectSRS(Struct, kw_only=True):
    id: int
    display_name: str


class InspectResponse(Struct, kw_only=True):
    crs: InspectCRS | None
    srs_candidates: list[InspectSRS]
    point_count: int
    point_format_id: int
    has_rgb: bool


def inspect_response(path: Path) -> InspectResponse:
    info = inspect_copc(path)

    crs, candidates = None, []
    if (fcrs := info.crs) is not None:
        crs = InspectCRS(
            display_name=fcrs.display_name,
            auth=fcrs.auth,
            vertical_display_name=fcrs.vertical_display_name,
            vertical_auth=fcrs.vertical_auth,
        )
        candidates = find_srs_candidates(fcrs)

    return InspectResponse(
        crs=crs,
        srs_candidates=[
            InspectSRS(id=srs.id, display_name=srs.display_name) for srs in candidates
        ],
        point_count=info.point_count,
        point_format_id=info.point_format_id,
        has_rgb=info.has_rgb,
    )


def inspect(request, *, body: FileUploadRef) -> InspectResponse:
    """Inspect uploaded COPC file

    :returns: Point cloud metadata, its coordinate system and matching
        coordinate systems registered in NextGIS Web"""

    return inspect_response(body().data_path)


def layer_inspect(resource: PointCloudLayer, request) -> InspectResponse:
    """Inspect COPC file of point cloud layer

    :returns: Point cloud metadata, its coordinate system and matching
        coordinate systems registered in NextGIS Web"""

    request.resource_permission(DataScope.read)
    return inspect_response(resource.fileobj.filename())


def copc_head(resource: PointCloudLayer, request) -> Response:
    request.resource_permission(DataScope.read)

    filename = resource.fileobj.filename()
    return Response(
        accept_ranges="bytes",
        content_length=filename.stat().st_size,
        content_type=POINT_CLOUD_CONTENT_TYPE,
    )


def copc_get(resource: PointCloudLayer, request) -> Response:
    request.resource_permission(DataScope.read)

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
        "point_cloud.inspect",
        "/api/component/point_cloud/inspect",
        post=inspect,
    )

    point_cloud_factory = ResourceFactory(context=PointCloudLayer)
    config.add_route(
        "point_cloud.layer_inspect",
        "/api/resource/{id}/point_cloud/inspect",
        factory=point_cloud_factory,
        get=layer_inspect,
    )

    # QGIS recognizes COPC by the file name, so the path has to end with .copc.laz
    config.add_route(
        "point_cloud.copc",
        "/api/resource/{id}/point_cloud.copc.laz",
        factory=point_cloud_factory,
        head=copc_head,
        get=copc_get,
    )
