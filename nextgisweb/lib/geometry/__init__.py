from struct import pack, unpack
from typing import Self

from osgeo import gdal, osr
from osgeo import ogr as osgeo_ogr
from pyproj import CRS
from shapely import Geometry as SHPGeometry
from shapely import wkb, wkt
from shapely.geometry import box as geometry_box
from shapely.geometry import mapping as geometry_mapping
from shapely.geometry import shape as geometry_shape
from shapely.ops import transform as map_coords

from ..ogrhelper import cohere_bytes
from ..osrhelper import sr_from_wkt

__all__ = [
    "Geometry",
    "GeometryNotValid",
    "Transformer",
    "geom_area",
    "geom_length",
]


class GeometryNotValid(ValueError):
    pass


class Geometry:
    """Initialization format is kept "as is".
    Other formats are calculated as needed."""

    __slots__ = ("_wkb", "_wkt", "_ogr", "_shape", "_srid")

    def __init__(
        self,
        wkb: bytes | None = None,
        wkt: str | None = None,
        ogr: osgeo_ogr.Geometry | None = None,
        shape: SHPGeometry = None,
        srid: int | None = None,
        validate: bool = False,
    ) -> None:
        if wkb is None and wkt is None and ogr is None and shape is None:
            raise ValueError("None base format is not defined.")

        if wkb is not None:
            if isinstance(wkb, bytes):
                self._wkb = wkb
            else:
                raise ValueError(f"Bytes expected, got {type(wkb).__name__}")
        else:
            self._wkb = None

        self._wkt = wkt
        self._ogr = ogr
        self._shape = shape

        self._srid = srid

        if validate and (wkb is not None or wkt is not None):
            if wkb is not None and len(wkb) >= 5:
                # Reject EWKB (embedded SRID flag 0x20000000) — use srid= instead
                bo = wkb[0]
                (wkb_type,) = unpack("<i" if bo == 1 else ">i", wkb[1:5])
                if wkb_type & 0x20000000:
                    raise GeometryNotValid("EWKB with embedded SRID is not accepted")
            # Validate through Shapely/GEOS to catch structural errors that OGR
            # silently accepts but PostGIS would reject.
            try:
                _ = self.shape
            except Exception as e:
                raise GeometryNotValid from e

    @property
    def srid(self) -> int | None:
        return self._srid

    # Base constructors

    @classmethod
    def from_wkb(cls, data: bytes, srid: int | None = None, validate: bool = True) -> Self:
        return cls(wkb=data, srid=srid, validate=validate)

    @classmethod
    def from_wkt(cls, data: str, srid: int | None = None, validate: bool = True) -> Self:
        return cls(wkt=data, srid=srid, validate=validate)

    @classmethod
    def from_ogr(
        cls, data: osgeo_ogr.Geometry, srid: int | None = None, validate: bool = True
    ) -> Self:
        return cls(ogr=data, srid=srid, validate=validate)

    @classmethod
    def from_shape(
        cls, data: SHPGeometry, srid: int | None = None, validate: bool = False
    ) -> Self:
        return cls(shape=data, srid=srid, validate=validate)

    # Additional constructors

    @classmethod
    def from_geojson(cls, data: dict, srid: int | None = None, validate: bool = True) -> Self:
        shape = geometry_shape(data)
        return cls.from_shape(shape, srid=srid, validate=validate)

    @classmethod
    def from_box(
        cls, minx: float, miny: float, maxx: float, maxy: float, srid: int | None = None
    ) -> Self:
        return cls.from_shape(geometry_box(minx, miny, maxx, maxy), srid=srid)

    # Base output formats

    @property
    def wkb(self) -> bytes:
        if self._wkb is None:
            if self._ogr is None and self._shape is not None:
                self._wkb = self._shape.wkb
            else:
                # ORG is the fastest, so convert to OGR and then to WKB.
                self._wkb = cohere_bytes(self.ogr.ExportToWkb(osgeo_ogr.wkbNDR))
        return self._wkb

    @property
    def wkt(self) -> str:
        if self._wkt is None:
            if self._ogr is None and self._shape is not None:
                self._wkt = self._shape.wkt
            else:
                # ORG is the fastest, so convert to OGR and then to WKT.
                self._wkt = self.ogr.ExportToIsoWkt()
        return self._wkt

    @property
    def ogr(self) -> osgeo_ogr.Geometry:
        if self._ogr is None:
            if self._wkb is None and self._wkt is not None:
                self._ogr = osgeo_ogr.CreateGeometryFromWkt(self._wkt)
            else:
                # WKB is the fastest, so convert to WKB and then to OGR.
                self._ogr = osgeo_ogr.CreateGeometryFromWkb(self.wkb)

        if self._ogr is None:
            raise GeometryNotValid("Invalid geometry WKB/WKT value!")

        return self._ogr

    @property
    def shape(self) -> SHPGeometry:
        if self._shape is None:
            if self._wkb is None and self._wkt is not None:
                self._shape = wkt.loads(self._wkt)
            else:
                # WKB is the fastest, so convert to WKB and then to shape.
                self._shape = wkb.loads(self.wkb)
        return self._shape

    # Additional output formats

    def to_geojson(self) -> dict:
        # NB: srid is not considered
        return geometry_mapping(self.shape)

    def to_ewkb(self) -> bytes:
        wkb = self.wkb
        if (srid := self.srid) is None:
            return wkb

        bo = wkb[0]
        if bo == 1:
            fi, fo = "<i", "<Bii"
        elif bo == 0:
            fi, fo = ">i", ">Bii"
        else:
            raise ValueError(f"Invalid WKB byte order: {wkb[0]=}")

        wkb_type = unpack(fi, wkb[1:5])[0]
        return pack(fo, bo, wkb_type | 0x20000000, srid) + wkb[5:]

    # Editors

    def flip_coordinates(self) -> Self:
        shape = map_coords(lambda x, y: (y, x), self.shape)
        # ty: ignore[invalid-return-type]
        return Geometry.from_shape(shape, srid=self.srid)

    # Shapely providers

    @property
    def bounds(self) -> tuple[float, float, float, float]:
        return self.shape.bounds


class Transformer:
    def __init__(self, wkt_from: str, wkt_to: str) -> None:
        sr_from = sr_from_wkt(wkt_from)
        sr_to = sr_from_wkt(wkt_to)

        if sr_from.IsSame(sr_to):
            self._transformation = None
        else:
            self._transformation = osr.CoordinateTransformation(sr_from, sr_to)

    def transform(self, geom: Geometry) -> Geometry:
        # NB: geom.srid is not considered
        ogr_geom = geom.ogr.Clone()
        if self._transformation is not None:
            try:
                result = ogr_geom.Transform(self._transformation)
                if result != 0:
                    raise ValueError(gdal.GetLastErrorMsg())
            except (NotImplementedError, TypeError):
                raise ValueError(gdal.GetLastErrorMsg())
        return Geometry.from_ogr(ogr_geom)


def crs_unit_factor(crs: CRS) -> float:
    return crs.axis_info[0].unit_conversion_factor if len(crs.axis_info) > 0 else 1.0


def geom_length(geom: Geometry, crs_wkt: str) -> float:
    shape = geom.shape
    crs = CRS.from_wkt(crs_wkt)

    if crs.is_geographic:
        geod = crs.get_geod()
        assert geod is not None
        return geod.geometry_length(shape)
    else:
        return shape.length * crs_unit_factor(crs)


def geom_area(geom: Geometry, crs_wkt: str) -> float:
    shape = geom.shape
    crs = CRS.from_wkt(crs_wkt)

    if crs.is_geographic:
        geod = crs.get_geod()
        assert geod is not None
        return geod.geometry_area_perimeter(shape)[0]
    else:
        return shape.area * crs_unit_factor(crs) ** 2
