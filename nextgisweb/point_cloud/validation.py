from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from laspy.copc import CopcReader
from osgeo import osr
from pyproj import CRS

from nextgisweb.env import gettext, gettextf
from nextgisweb.lib.osrhelper import SpatialReferenceError, sr_from_wkt

from nextgisweb.core.exception import ValidationError
from nextgisweb.spatial_ref_sys import SRS

SUPPORTED_POINT_FORMATS = (6, 7, 8)


def _authority(crs: CRS) -> str | None:
    if (authority := crs.to_authority()) is None:
        return None
    return ":".join(authority)


@dataclass(kw_only=True)
class FileCRS:
    """Coordinate system as stored in the point cloud file"""

    display_name: str
    auth: str | None
    osr: osr.SpatialReference

    vertical_display_name: str | None = None
    vertical_auth: str | None = None

    @classmethod
    def from_crs(cls, crs: CRS) -> FileCRS:
        vertical = None
        # NextGIS Web coordinate systems are 2D, so only the horizontal part of
        # a compound CRS is matched, and the vertical one is informational
        if crs.is_compound:
            crs, vertical = crs.sub_crs_list[0], crs.sub_crs_list[1]

        try:
            crs_osr = sr_from_wkt(crs.to_wkt())
        except SpatialReferenceError as exc:
            raise ValidationError(
                message=gettext("Unable to parse the point cloud coordinate system.")
            ) from exc

        return cls(
            display_name=crs.name,
            auth=_authority(crs),
            osr=crs_osr,
            vertical_display_name=vertical.name if vertical else None,
            vertical_auth=_authority(vertical) if vertical else None,
        )

    def is_same(self, srs: SRS) -> bool:
        if self.auth is not None and self.auth == f"{srs.auth_name}:{srs.auth_srid}":
            return True
        return bool(self.osr.IsSame(srs.to_osr()))


@dataclass(kw_only=True)
class PointCloudInfo:
    crs: FileCRS | None
    point_count: int
    point_format_id: int
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


def find_srs_candidates(crs: FileCRS) -> list[SRS]:
    """Find registered coordinate systems equivalent to the file one"""

    result = []
    if crs.auth is not None:
        auth_name, auth_code = crs.auth.split(":")
        srs = SRS.filter_by(auth_name=auth_name, auth_srid=int(auth_code)).one_or_none()
        if srs is not None:
            result.append(srs)

    # Coordinate systems added from WKT have no authority fields set, so look
    # for equivalent ones among all registered
    for srs in SRS.query().order_by(SRS.id):
        if srs not in result and crs.osr.IsSame(srs.to_osr()):
            result.append(srs)

    return result


def resolve_srs(crs: FileCRS | None, srs: SRS | None) -> SRS:
    """Validate the specified coordinate system or pick a matching one"""

    if srs is not None:
        if crs is not None and not crs.is_same(srs):
            raise ValidationError(
                message=gettext(
                    "The specified coordinate system does not match the "
                    "coordinate system of the point cloud file."
                )
            )
        return srs

    if crs is None:
        raise ValidationError(
            message=gettext(
                "The point cloud file has no coordinate system info. Specify it manually."
            )
        )

    candidates = find_srs_candidates(crs)
    if len(candidates) == 1:
        return candidates[0]

    if len(candidates) > 1:
        raise ValidationError(
            message=gettext(
                "Several matching coordinate systems are registered in NextGIS "
                "Web. Specify one of them."
            )
        )

    if crs.auth is None:
        raise ValidationError(
            message=gettext(
                "The point cloud coordinate system could not be identified. "
                "Make sure the file has a recognized EPSG coordinate system."
            )
        )

    raise ValidationError(
        message=gettextf(
            "The point cloud coordinate system ({auth}) is not registered "
            "in NextGIS Web. Add it to the list of supported coordinate "
            "systems first."
        )(auth=crs.auth)
    )


def inspect_copc(path: Path) -> PointCloudInfo:
    try:
        reader = CopcReader.open(str(path))
    except Exception as exc:
        raise ValidationError(message=gettext("Invalid COPC point cloud.")) from exc

    with reader:
        header = reader.header
        point_format_id = header.point_format.id
        if point_format_id not in SUPPORTED_POINT_FORMATS:
            raise ValidationError(
                message=gettext("Only COPC point formats 6, 7, and 8 are supported.")
            )

        if len(reader.query(level=0)) == 0:
            raise ValidationError(message=gettext("The COPC hierarchy is empty or corrupted."))

        try:
            crs = header.parse_crs()
        except Exception as exc:
            raise ValidationError(
                message=gettext("Unable to parse the point cloud coordinate system.")
            ) from exc

        minx, miny, zmin = (float(v) for v in header.mins)
        maxx, maxy, zmax = (float(v) for v in header.maxs)

        return PointCloudInfo(
            crs=FileCRS.from_crs(crs) if crs is not None else None,
            point_count=int(header.point_count),
            point_format_id=point_format_id,
            minx=minx,
            miny=miny,
            maxx=maxx,
            maxy=maxy,
            zmin=zmin,
            zmax=zmax,
            # PDRF 6-8 always contain intensity, classification and returns
            has_rgb=point_format_id in (7, 8),
            has_intensity=True,
            has_classification=True,
            has_returns=True,
        )
