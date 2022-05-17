import re
from io import BytesIO
from requests.exceptions import RequestException
from urllib.parse import urlparse

import PIL
from osgeo import osr, ogr
from zope.interface import implementer

from .. import db
from ..lib.osrhelper import traditional_axis_mapping
from ..core.exception import ExternalServiceError, ValidationError
from ..env import env
from ..layer import SpatialLayerMixin, IBboxLayer
from ..models import declarative_base
from ..render import IExtentRenderRequest, IRenderableStyle, ITileRenderRequest
from ..resource import (
    ConnectionScope,
    DataScope,
    DataStructureScope,
    Resource,
    ResourceGroup,
    Serializer,
    SerializedProperty as SP,
    SerializedRelationship as SR,
    SerializedResourceRelationship as SRR,
)
from .util import _, crop_box, render_zoom, quad_key
from .session_keeper import get_session


Base = declarative_base(dependencies=('resource', ))

NEXTGIS_GEOSERVICES = 'nextgis_geoservices'

url_template_pattern = re.compile(r'^(https?:\/\/)([a-zа-яё0-9\-._~%]+|\[[a-zа-яё0-9\-._~%!$&\'()*+,;=:]+\])+(:[0-9]+)?(\/[a-zа-яё0-9\-._~%!$&\'()*+,;=:@\{\}]+)*\/?(\?[a-zа-яё0-9\-._~%!$&\'()*+,;=:@\/\{\}?]*)?$', re.IGNORECASE | re.UNICODE)  # NOQA


class SCHEME(object):
    XYZ = 'xyz'
    TMS = 'tms'

    enum = (XYZ, TMS)


def toggle_tms_xyz_y(z, y):
    return (1 << z) - y - 1


class Connection(Base, Resource):
    identity = 'tmsclient_connection'
    cls_display_name = _('TMS connection')

    __scope__ = ConnectionScope

    capmode = db.Column(db.Enum(NEXTGIS_GEOSERVICES))
    url_template = db.Column(db.Unicode, nullable=False)
    apikey = db.Column(db.Unicode)
    apikey_param = db.Column(db.Unicode)
    username = db.Column(db.Unicode)
    password = db.Column(db.Unicode)
    scheme = db.Column(db.Enum(*SCHEME.enum), nullable=False, default=SCHEME.XYZ)
    insecure = db.Column(db.Boolean, nullable=False, default=False)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    @property
    def query_params(self):
        params = dict()
        if self.apikey:
            params[self.apikey_param or 'apikey'] = self.apikey
        return params

    def get_tile(self, tile, layer_name):
        z, x, y = tile
        if self.scheme == SCHEME.TMS:
            y = toggle_tms_xyz_y(z, y)

        session = get_session(self.id, urlparse(self.url_template).scheme,
                              self.username, self.password)

        try:
            response = session.get(
                self.url_template.format(
                    x=x, y=y, z=z,
                    q=quad_key(x, y, z),
                    layer=layer_name
                ),
                params=self.query_params,
                headers=env.tmsclient.headers,
                timeout=env.tmsclient.options['timeout'].total_seconds(),
                verify=not self.insecure
            )
        except RequestException:
            raise ExternalServiceError()

        if response.status_code == 200:
            data = BytesIO(response.content)
            try:
                return PIL.Image.open(data)
            except IOError:
                raise ExternalServiceError("Image processing error.")
        elif response.status_code in (204, 404):
            return None
        else:
            raise ExternalServiceError()


class _url_template_attr(SP):

    def setter(self, srlzr, value):
        if value is not None and not url_template_pattern.match(value):
            raise ValidationError("Invalid url template.")

        super().setter(srlzr, value)


class _capmode_attr(SP):

    def setter(self, srlzr, value):
        if value is None:
            pass
        elif value == NEXTGIS_GEOSERVICES:
            if srlzr.obj.id is None or srlzr.obj.capmode != NEXTGIS_GEOSERVICES:
                apikey = srlzr.data.get('apikey')
                if apikey is None or len(apikey) == 0:
                    raise ValidationError(message=_("API key required."))
            srlzr.obj.url_template = env.tmsclient.options['nextgis_geoservices.url_template']
            srlzr.obj.apikey_param = 'apikey'
            srlzr.obj.scheme = SCHEME.XYZ
        else:
            raise ValidationError(message='Invalid capmode value!')

        super().setter(srlzr, value)


class ConnectionSerializer(Serializer):
    identity = Connection.identity
    resclass = Connection

    _defaults = dict(read=ConnectionScope.read,
                     write=ConnectionScope.write)

    url_template = _url_template_attr(**_defaults)
    apikey = SP(**_defaults)
    apikey_param = SP(**_defaults)
    username = SP(**_defaults)
    password = SP(**_defaults)
    scheme = SP(**_defaults)
    insecure = SP(**_defaults)

    capmode = _capmode_attr(**_defaults)


@implementer(IExtentRenderRequest, ITileRenderRequest)
class RenderRequest(object):
    def __init__(self, style, srs, cond):
        self.style = style
        self.srs = srs
        self.cond = cond

    def render_extent(self, extent, size):
        zoom = render_zoom(self.srs, extent, size, self.style.tilesize)
        zoom = min(max(zoom, self.style.minzoom), self.style.maxzoom)
        return self.style.render_image(extent, size, self.srs, zoom)

    def render_tile(self, tile, size):
        zoom = tile[0]
        if zoom < self.style.minzoom or zoom > self.style.maxzoom:
            raise ValidationError(message=_("Zoom is out of range."))
        extent = self.srs.tile_extent(tile)
        return self.style.render_image(extent, (size, size), self.srs, zoom)


@implementer(IRenderableStyle, IBboxLayer)
class Layer(Base, Resource, SpatialLayerMixin):
    identity = 'tmsclient_layer'
    cls_display_name = _('TMS layer')

    __scope__ = (DataStructureScope, DataScope)

    connection_id = db.Column(db.ForeignKey(Connection.id), nullable=False)
    layer_name = db.Column(db.Unicode)
    tilesize = db.Column(db.Integer, nullable=False, default=256)
    minzoom = db.Column(db.Integer, nullable=False, default=0)
    maxzoom = db.Column(db.Integer, nullable=False, default=14)
    extent_left = db.Column(db.Float, default=-180.0)
    extent_right = db.Column(db.Float, default=+180.0)
    extent_bottom = db.Column(db.Float, default=-90.0)
    extent_top = db.Column(db.Float, default=+90.0)

    connection = db.relationship(
        Connection, foreign_keys=connection_id,
        cascade=False, cascade_backrefs=False,
    )

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def render_request(self, srs, cond=None):
        return RenderRequest(self, srs, cond)

    def render_image(self, extent, size, srs, zoom):

        #################################
        #  ":" - requested extent
        #  "|" - received extent from TMS
        # a0_____ _____ _____ _____
        #  | ....|.....|.....|.... |
        #  | : a1|     |     |   : |
        #  |‾:‾‾‾|‾‾‾‾‾|‾‾‾‾‾|‾‾‾:‾|
        #  | :   |     |   b0|   : |
        #  |‾:‾‾‾|‾‾‾‾‾|‾‾‾‾‾|‾‾‾:‾|
        #  | ····|·····|·····|···· |
        #   ‾‾‾‾‾ ‾‾‾‾‾ ‾‾‾‾‾ ‾‾‾‾‾b1
        #################################

        def transform_extent(extent, src_osr, dst_osr):
            ct = osr.CoordinateTransformation(src_osr, dst_osr)

            def transform_point(x, y):
                p = ogr.Geometry(ogr.wkbPoint)
                p.AddPoint(x, y)
                p.Transform(ct)
                return (p.GetX(), p.GetY())

            return transform_point(*extent[0:2]) + transform_point(*extent[2:4])

        def prepare_geog_extent(extent):
            return (
                extent[0], max(extent[1], -85.0511),
                extent[2], min(extent[3], 85.0511),
            )

        dst_osr = self.srs.to_osr()
        traditional_axis_mapping(dst_osr)

        extent_max = prepare_geog_extent((self.extent_left, self.extent_bottom, self.extent_right, self.extent_top))
        if self.srs.id != 4326:
            wgs84_osr = traditional_axis_mapping(osr.SpatialReference())
            wgs84_osr.ImportFromEPSG(4326)
            extent_max = transform_extent(extent_max, wgs84_osr, dst_osr)

        if srs.is_geographic:
            extent = prepare_geog_extent(extent)

        if srs.id != self.srs.id:
            req_osr = srs.to_osr()
            traditional_axis_mapping(req_osr)
            extent = transform_extent(extent, req_osr, dst_osr)

        xtile_from, ytile_from, xtile_to, ytile_to = self.srs.extent_tile_range(extent, zoom)

        width = (xtile_to + 1 - xtile_from) * self.tilesize
        height = (ytile_to + 1 - ytile_from) * self.tilesize

        xtile_min, ytile_min, xtile_max, ytile_max = self.srs.extent_tile_range(extent_max, zoom)

        x_offset = max(xtile_min - xtile_from, 0)
        y_offset = max(ytile_min - ytile_from, 0)

        image = None

        for x, xtile in enumerate(
            range(xtile_from + x_offset, min(xtile_to, xtile_max) + 1),
            start=x_offset
        ):
            for y, ytile in enumerate(
                range(ytile_from + y_offset, min(ytile_to, ytile_max) + 1),
                start=y_offset
            ):
                tile_image = self.connection.get_tile((zoom, xtile, ytile), self.layer_name)
                if tile_image is None:
                    continue
                if image is None:
                    image = PIL.Image.new('RGBA', (width, height))
                image.paste(tile_image, (x * self.tilesize, y * self.tilesize))

        if image is None:
            return None

        a0x, a1y, a1x, a0y = self.srs.tile_extent((zoom, xtile_from, ytile_from))
        b0x, b1y, b1x, b0y = self.srs.tile_extent((zoom, xtile_to, ytile_to))
        box = crop_box((a0x, b1y, b1x, a0y), extent, width, height)
        image = image.crop(box)

        if image.size != size:
            image = image.resize(size)

        return image

    # IBboxLayer implementation:
    @property
    def extent(self):
        return dict(
            minLon=self.extent_left,
            maxLon=self.extent_right,
            minLat=self.extent_bottom,
            maxLat=self.extent_top,
        )


DataScope.read.require(
    ConnectionScope.connect,
    attr='connection', cls=Layer,
)


class _layer_name_attr(SP):

    def setter(self, srlzr, value):
        if srlzr.obj.id is None or srlzr.obj.layer_name != value:
            if (
                (value is None or len(value) == 0)
                and r'{layer}' in srlzr.obj.connection.url_template
            ):
                raise ValidationError(message=_("Layer name required."))

        super().setter(srlzr, value)


class LayerSerializer(Serializer):
    identity = Layer.identity
    resclass = Layer

    _defaults = dict(read=DataStructureScope.read,
                     write=DataStructureScope.write)

    connection = SRR(**_defaults)
    srs = SR(**_defaults)
    layer_name = _layer_name_attr(**_defaults)
    tilesize = SP(**_defaults)
    minzoom = SP(**_defaults)
    maxzoom = SP(**_defaults)
    extent_left = SP(**_defaults)
    extent_right = SP(**_defaults)
    extent_bottom = SP(**_defaults)
    extent_top = SP(**_defaults)
