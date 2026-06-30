from typing import Annotated, Literal

from msgspec import UNSET, Struct, UnsetType

from nextgisweb.lib.apitype import StatusCode

from nextgisweb.core.exception import ValidationError
from nextgisweb.file_upload import FileUploadRef
from nextgisweb.spatial_ref_sys import SRS, SRSRef

from .validation import PointCloudExtent, validate_external_url, validate_upload


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


def setup_pyramid(comp, config):
    config.add_route(
        "point_cloud.validate",
        "/api/component/point_cloud/validate",
        post=validate,
    )
