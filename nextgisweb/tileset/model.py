import re
import sqlite3
from contextlib import closing
from functools import lru_cache
from io import BytesIO
from tempfile import NamedTemporaryFile
from zipfile import ZipFile, is_zipfile

import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
import sqlalchemy.orm as orm
from osgeo import ogr, osr
from PIL import Image, UnidentifiedImageError
from zope.interface import implementer

from nextgisweb.env import COMP_ID, Base, env, gettext, gettextf
from nextgisweb.lib.osrhelper import sr_from_epsg
from nextgisweb.lib.registry import list_registry

from nextgisweb.core import KindOfData
from nextgisweb.core.exception import ValidationError
from nextgisweb.file_storage import FileObj
from nextgisweb.file_upload import FileUploadRef
from nextgisweb.layer import IBboxLayer, SpatialLayerMixin
from nextgisweb.render import (
    IExtentRenderRequest,
    IRenderableNonCached,
    IRenderableStyle,
    ITileRenderRequest,
)
from nextgisweb.resource import (
    DataScope,
    Resource,
    ResourceGroup,
    ResourceScope,
    SAttribute,
    Serializer,
    SRelationship,
)
from nextgisweb.tmsclient.util import crop_box, render_zoom, toggle_tms_xyz_y

TILE_SIZE = 256
JPEG_EXTS = ("jpg", "jpeg")
COLOR_MAGIC = "NGT1".encode("ascii")


def imgcolor(img):
    extrema = img.getextrema()
    if len(img.getbands()) == 1:
        extrema = [extrema]
        rgba = False
    else:
        rgba = img.mode == "RGBA"

    if rgba:
        alpha = extrema[3]
        if alpha[0] == 0 and alpha[1] == 0:
            return (0, 0, 0, 0)

    for comp in extrema:
        if comp[0] != comp[1]:
            return None

    if not rgba:
        extrema = img.convert("RGBA").getextrema()

    return [c[0] for c in extrema]


def transform_extent(extent, src_osr, dst_osr):
    ct = osr.CoordinateTransformation(src_osr, dst_osr)

    def transform_point(x, y):
        p = ogr.Geometry(ogr.wkbPoint)
        p.AddPoint(x, y)
        p.Transform(ct)
        return p.GetX(), p.GetY()

    return transform_point(*extent[0:2]) + transform_point(*extent[2:4])


Base.depends_on("resource")


class TilesetData(KindOfData):
    identity = "tileset"
    display_name = gettext("Tilesets")


class TileValidationError(ValidationError):
    tile_message = gettext("Tile {} unsupported.")

    def __init__(self, tile, message):
        tile_message = self.__class__.tile_message.format("z=%d x=%d y=%d" % tile)
        message = tile_message + " " + message
        super().__init__(message)


@implementer(IExtentRenderRequest, ITileRenderRequest)
class RenderRequest:
    def __init__(self, style, srs):
        self.style = style
        self.srs = srs

    def _check_zoom(self, zoom):
        return self.style.tileset_zmin <= zoom <= self.style.tileset_zmax

    def render_extent(self, extent, size):
        zoom = render_zoom(self.srs, extent, size, TILE_SIZE)
        if not self._check_zoom(zoom):
            return None
        return self.style.render_image(extent, size, self.srs, zoom)

    def render_tile(self, tile, size):
        zoom = tile[0]
        if not self._check_zoom(zoom):
            return None
        extent = self.srs.tile_extent(tile)
        return self.style.render_image(extent, (size, size), self.srs, zoom)


@lru_cache(maxsize=32)
def get_tile_db(db_path):
    return sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)


@implementer(IRenderableStyle, IRenderableNonCached, IBboxLayer)
class Tileset(Base, Resource, SpatialLayerMixin):
    identity = "tileset"
    cls_display_name = gettext("Tileset")

    __scope__ = DataScope

    fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=False)
    tileset_zmin = sa.Column(sa.SmallInteger, nullable=False)
    tileset_zmax = sa.Column(sa.SmallInteger, nullable=False)
    tileset_ntiles = sa.Column(
        sa_pg.ARRAY(sa.Integer, dimensions=1, zero_indexes=True),
        nullable=False,
    )
    minx = sa.Column(sa.Float, nullable=False)
    miny = sa.Column(sa.Float, nullable=False)
    maxx = sa.Column(sa.Float, nullable=False)
    maxy = sa.Column(sa.Float, nullable=False)

    fileobj = orm.relationship(FileObj, cascade="all")

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def render_request(self, srs, cond=None):
        return RenderRequest(self, srs)

    def render_image(self, extent, size, srs, zoom):
        assert srs.id == self.srs.id == 3857

        xtile_from, ytile_from, xtile_to, ytile_to = self.srs.extent_tile_range(extent, zoom)

        width = (xtile_to + 1 - xtile_from) * TILE_SIZE
        height = (ytile_to + 1 - ytile_from) * TILE_SIZE

        image = None

        db_path = self.fileobj.filename()
        connection = get_tile_db(str(db_path))

        # fmt: off
        for x, y, data in connection.execute("""
            SELECT x, y, data FROM tile
            WHERE z = ? AND (x BETWEEN ? AND ?) AND (y BETWEEN ? AND ?)
        """, (zoom, xtile_from, xtile_to, ytile_from, ytile_to)):
        # fmt: on
            if data.startswith(COLOR_MAGIC):
                tile_image = Image.new(
                    "RGBA",
                    (TILE_SIZE, TILE_SIZE),
                    tuple(data[len(COLOR_MAGIC) :]),
                )
            else:
                tile_image = Image.open(BytesIO(data))

            if image is None:
                image = Image.new("RGBA", (width, height))
            image.paste(tile_image, ((x - xtile_from) * TILE_SIZE, (y - ytile_from) * TILE_SIZE))

        if image is not None:
            a0x, a1y, a1x, a0y = self.srs.tile_extent((zoom, xtile_from, ytile_from))
            b0x, b1y, b1x, b0y = self.srs.tile_extent((zoom, xtile_to, ytile_to))
            box = crop_box((a0x, b1y, b1x, a0y), extent, width, height)
            image = image.crop(box)

            if image.size != size:
                image = image.resize(size)

        return image

    @property
    def extent(self):
        extent = transform_extent(
            (self.minx, self.miny, self.maxx, self.maxy),
            self.srs.to_osr(),
            sr_from_epsg(4326),
        )
        return dict(
            minLon=extent[0],
            maxLon=extent[2],
            minLat=extent[1],
            maxLat=extent[3],
        )

    def get_info(self):
        s = super()
        return (s.get_info() if hasattr(s, "get_info") else ()) + (
            (gettext("Number of tiles"), sum(self.tileset_ntiles)),
            (
                gettext("Zoom levels"),
                gettextf("From {min} to {max}")(
                    min=self.tileset_zmin,
                    max=self.tileset_zmax,
                ),
            ),
        )


@list_registry
class FileFormat:
    pattern: re.Pattern
    offset_z: int = 0

    def __init_subclass__(cls):
        cls.pattern = re.compile(cls.pattern)

    def __new__(cls, filename):
        if match := cls.pattern.match(filename):
            obj = super().__new__(cls)
            obj.filename = filename
            obj.prefix = match["prefix"]
            if "ext" in cls.pattern.groupindex:
                ext = match["ext"].lower()
                if ext in JPEG_EXTS:
                    obj.ext = JPEG_EXTS
                else:
                    obj.ext = (ext,)
            else:
                obj.ext = None
            return obj

    def get_tile(self, filename):
        if match := self.pattern.match(filename):
            if match["prefix"] != self.prefix:
                raise ValidationError(
                    message=gettextf(
                        "Tiles '{}' and '{}' are located in different subdirectories."
                    )(self.filename, filename)
                )
            if self.ext is not None and match["ext"].lower() not in self.ext:
                raise ValidationError(
                    message=gettextf("Tiles '{}' and '{}' have different extensions.")(
                        self.filename, filename
                    )
                )
            return (
                int(match["z"]) + self.offset_z,
                int(match["x"]),
                int(match["y"]),
            )


class XYZ(FileFormat):
    pattern = r"^(?P<prefix>.*/)?(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+)\.(?P<ext>(?i:png|jpe?g))$"


class SASPlanet(FileFormat):
    pattern = r"^(?P<prefix>.*/)?z(?P<z>\d+)/\d+/x(?P<x>\d+)/\d+/y(?P<y>\d+)\.(?:png)$"
    offset_z = -1


def read_file(fn):
    if is_zipfile(fn):
        with ZipFile(fn) as zf:
            fmt = None
            for info in zf.infolist():
                if info.is_dir():
                    continue
                filename = info.filename.replace("\\", "/")  # Fix wrong separator issues
                if fmt is None:
                    for candidate in FileFormat.registry:
                        if _fmt := candidate(filename):
                            fmt = _fmt
                            break
                    else:
                        continue
                if tile := fmt.get_tile(filename):
                    z, x, y = tile
                    data = zf.read(info)
                    yield z, x, y, data
        return

    with (
        sqlite3.connect(f"file:{fn}?mode=ro", uri=True) as connection,
        closing(connection.cursor()) as cursor,
    ):
        sql_tiles = """
            SELECT zoom_level, tile_column, tile_row, tile_data FROM tiles
            ORDER BY zoom_level, tile_column, tile_row
        """
        try:
            cursor.execute(sql_tiles + " LIMIT 1").fetchone()
        except sqlite3.DatabaseError:
            pass  # Not MBTiles
        else:
            try:
                for z, x, y, data in cursor.execute(sql_tiles):
                    yield z, x, toggle_tms_xyz_y(z, y), data
                return
            except sqlite3.OperationalError:
                raise ValidationError(message="Error reading SQLite DB.")

    raise ValidationError(message=gettext("Unsupported data format."))


class SourceAttr(SAttribute):
    def set(self, srlzr, value: FileUploadRef, *, create: bool):
        if srlzr.obj.id is not None:
            env.core.reserve_storage(
                COMP_ID,
                TilesetData,
                value_data_volume=-srlzr.obj.fileobj.size,
                resource=srlzr.obj,
            )

        stat = dict()
        with NamedTemporaryFile() as tf:
            with sqlite3.connect(tf.name) as connection:
                cursor = connection.cursor()
                cursor.execute("PRAGMA page_size = 8192")
                cursor.execute("PRAGMA journal_mode = OFF")
                cursor.execute("PRAGMA synchronous = OFF")
                # fmt: off
                cursor.execute("""
                    CREATE TABLE tile (
                        z INTEGER, x INTEGER, y INTEGER,
                        data BLOB NOT NULL,
                        PRIMARY KEY (z, x, y)
                    )
                """)
                # fmt: on

                for z, x, y, img_data in read_file(value().data_path):
                    try:
                        img = Image.open(BytesIO(img_data))
                    except UnidentifiedImageError:
                        raise TileValidationError(
                            (z, x, y),
                            gettext("Unsupported data format."),
                        )
                    if img.size != (256, 256):
                        raise TileValidationError(
                            (z, x, y),
                            gettext("Only 256x256 px tiles are supported."),
                        )
                    color = imgcolor(img)
                    data = img_data if color is None else COLOR_MAGIC + bytes(color)
                    cursor.execute("INSERT INTO tile VALUES (?, ?, ?, ?)", (z, x, y, data))

                    if z not in stat:
                        stat[z] = [x, x, y, y, 1]
                    else:
                        stat_zoom = stat[z]
                        if x < stat_zoom[0]:
                            stat_zoom[0] = x
                        elif x > stat_zoom[1]:
                            stat_zoom[1] = x
                        if y < stat_zoom[2]:
                            stat_zoom[2] = y
                        elif y > stat_zoom[3]:
                            stat_zoom[3] = y
                        stat_zoom[4] += 1

                if len(stat) == 0:
                    raise ValidationError(message=gettext("No tiles found in source."))

                connection.commit()
                cursor.execute("VACUUM")

            srlzr.obj.fileobj = FileObj().copy_from(tf.name)
            env.core.reserve_storage(
                COMP_ID,
                TilesetData,
                value_data_volume=srlzr.obj.fileobj.size,
                resource=srlzr.obj,
            )

        zmin = zmax = None
        for z in stat.keys():
            if zmin is None:
                zmin = zmax = z
            else:
                if z < zmin:
                    zmin = z
                elif z > zmax:
                    zmax = z

        srlzr.obj.tileset_zmin = zmin
        srlzr.obj.tileset_zmax = zmax
        srlzr.obj.tileset_ntiles = tuple(
            (stat[z][4] if z in stat else 0) for z in range(zmin, zmax + 1)
        )

        xtile_min, xtile_max, ytile_min, ytile_max, _ntiles = stat[zmax]
        assert xtile_min <= xtile_max and ytile_min <= ytile_max

        # NOTE: Y-axis is top to bottom here!
        _minx, _miny = srlzr.obj.srs.tile_extent((zmax, xtile_min, ytile_max))[0:2]
        _maxx, _maxy = srlzr.obj.srs.tile_extent((zmax, xtile_max, ytile_min))[2:4]
        assert _minx <= _maxx and _miny <= _maxy, (_minx, _maxx, _miny, _maxy)

        srlzr.obj.minx = _minx
        srlzr.obj.maxx = _maxx
        srlzr.obj.miny = _miny
        srlzr.obj.maxy = _maxy


class TilesetSerializer(Serializer, resource=Tileset):
    srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update)
    source = SourceAttr(write=DataScope.write)
    zmin = SAttribute(read=ResourceScope.read, model_attr="tileset_zmin")
    zmax = SAttribute(read=ResourceScope.read, model_attr="tileset_zmax")
