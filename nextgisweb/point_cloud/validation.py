from __future__ import annotations

from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from msgspec import Struct
from osgeo import ogr, osr

from nextgisweb.env import gettext
from nextgisweb.lib.osrhelper import sr_from_epsg, sr_from_wkt

from nextgisweb.core.exception import ValidationError
from nextgisweb.file_upload.model import FileUpload
from nextgisweb.spatial_ref_sys import SRS

PointCloudSourceType = Literal["upload", "external_url"]


class PointCloudExtent(Struct, kw_only=True):
    minLon: float
    minLat: float
    maxLon: float
    maxLat: float


class PointCloudValidationResult(Struct, kw_only=True):
    point_count: int
    point_format_id: int
    epsg: int | None
    wkt: str | None
    srs_required: bool
    extent: PointCloudExtent | None
    minx: float
    miny: float
    maxx: float
    maxy: float
    zmin: float
    zmax: float
    has_rgb: bool
    has_intensity: bool
    has_classification: bool
    has_returns: bool


def _load_laspy():
    try:
        import laspy
    except ModuleNotFoundError as exc:
        raise ValidationError(
            message=gettext("Point cloud support requires the laspy package.")
        ) from exc
    return laspy


def _open_copc_reader(source: str | Path):
    laspy = _load_laspy()
    return laspy.copc.CopcReader.open(str(source))


def _to_extent(
    minx: float,
    miny: float,
    maxx: float,
    maxy: float,
    *,
    srs: SRS | None = None,
    wkt: str | None = None,
    epsg: int | None = None,
) -> PointCloudExtent | None:
    if srs is not None:
        src_sr = srs.to_osr()
    elif wkt:
        src_sr = sr_from_wkt(wkt)
    elif epsg is not None:
        src_sr = sr_from_epsg(epsg)
    else:
        return None

    dst_sr = sr_from_epsg(4326)
    ct = osr.CoordinateTransformation(src_sr, dst_sr)

    def transform_point(x: float, y: float) -> tuple[float, float]:
        point = ogr.Geometry(ogr.wkbPoint)
        point.AddPoint(x, y)
        point.Transform(ct)
        return point.GetX(), point.GetY()

    corners = (
        transform_point(minx, miny),
        transform_point(minx, maxy),
        transform_point(maxx, miny),
        transform_point(maxx, maxy),
    )
    xs = [c[0] for c in corners]
    ys = [c[1] for c in corners]
    return PointCloudExtent(
        minLon=min(xs),
        minLat=min(ys),
        maxLon=max(xs),
        maxLat=max(ys),
    )


def _validate_source(
    source: str | Path,
    *,
    srs: SRS | None = None,
) -> PointCloudValidationResult:
    try:
        reader = _open_copc_reader(source)
    except ValidationError:
        raise
    except Exception as exc:
        raise ValidationError(message=gettext("Invalid COPC point cloud.")) from exc

    try:
        header = reader.header
        point_format_id = header.point_format.id
        if point_format_id not in {6, 7, 8}:
            raise ValidationError(
                message=gettext("Only COPC point formats 6, 7, and 8 are supported.")
            )

        root = reader.query(level=0)
        root_length = len(root.array) if hasattr(root, "array") else len(root)
        if root_length == 0:
            raise ValidationError(message=gettext("The COPC hierarchy is empty or corrupted."))

        crs = header.parse_crs()
        epsg = crs.to_epsg() if crs is not None else None
        wkt = crs.to_wkt() if crs is not None else None

        minx, miny, zmin = [float(v) for v in header.mins]
        maxx, maxy, zmax = [float(v) for v in header.maxs]
        extent = _to_extent(minx, miny, maxx, maxy, srs=srs, wkt=wkt, epsg=epsg)

        return PointCloudValidationResult(
            point_count=int(header.point_count),
            point_format_id=point_format_id,
            epsg=epsg,
            wkt=wkt,
            srs_required=extent is None,
            extent=extent,
            minx=minx,
            miny=miny,
            maxx=maxx,
            maxy=maxy,
            zmin=zmin,
            zmax=zmax,
            has_rgb=point_format_id in (7, 8),
            has_intensity=True,
            has_classification=True,
            has_returns=True,
        )
    finally:
        close = getattr(reader, "close", None)
        if callable(close):
            close()


def validate_upload(
    file_upload: FileUpload, *, srs: SRS | None = None
) -> PointCloudValidationResult:
    return _validate_source(file_upload.data_path, srs=srs)


def validate_external_url(url: str, *, srs: SRS | None = None) -> PointCloudValidationResult:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValidationError(message=gettext("Only HTTP and HTTPS URLs are supported."))
    return _validate_source(url, srs=srs)
