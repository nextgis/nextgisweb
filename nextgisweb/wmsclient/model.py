import re
from io import BytesIO
from typing import Annotated, Literal
from urllib.parse import parse_qsl, quote, urlencode, urlparse, urlunparse

import PIL
import requests
import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
import sqlalchemy.orm as orm
from cachetools import LRUCache
from lxml import etree
from msgspec import Struct, field
from requests.exceptions import RequestException
from zope.interface import implementer

from nextgisweb.env import Base, env, gettext
from nextgisweb.lib import saext
from nextgisweb.lib.datetime import utcnow_naive
from nextgisweb.lib.pilhelper import reproject_render

from nextgisweb.core.exception import ExternalServiceError, ValidationError
from nextgisweb.jsrealm import TSExport
from nextgisweb.layer import IBboxLayer, SpatialLayerMixin
from nextgisweb.render import IExtentRenderRequest, IRenderableStyle, ITileRenderRequest
from nextgisweb.resource import (
    ConnectionScope,
    CRUTypes,
    DataScope,
    Resource,
    ResourceGroup,
    ResourceScope,
    SAttribute,
    SColumn,
    Serializer,
    SRelationship,
    SResource,
)
from nextgisweb.spatial_ref_sys import SRS

from .util import (
    find_tag,
    get_capability_formats,
    get_capability_layers,
    get_capability_srs,
    get_capability_urls,
)

Base.depends_on("resource")

WMS_VERSIONS = ("1.1.1", "1.3.0")

url_pattern = re.compile(
    r"^(https?:\/\/)([a-zа-яё0-9\-._~%]+|\[[a-zа-яё0-9\-._~%!$&\'()*+,;=:]+\])+(:[0-9]+)?(\/[a-zа-яё0-9\-._~%!$&\'()*+,;=:@]+)*\/?(\?[a-zа-яё0-9\-._~%!$&\'()*+,;=:@\/?]*)?$",
    re.IGNORECASE | re.UNICODE,
)

_capcache_cache: LRUCache = LRUCache(maxsize=64)


class Connection(Resource):
    identity = "wmsclient_connection"
    cls_display_name = gettext("WMS connection")

    __scope__ = ConnectionScope

    url = sa.Column(sa.Unicode, nullable=False)
    version = sa.Column(saext.Enum(*WMS_VERSIONS), nullable=False)
    username = sa.Column(sa.Unicode)
    password = sa.Column(sa.Unicode)
    insecure = sa.Column(sa.Boolean, nullable=False, default=False)
    referer = sa.Column(sa.Unicode)

    capcache_xml = orm.deferred(sa.Column(sa.Unicode))
    capcache_json = orm.deferred(sa.Column(sa_pg.JSONB))
    capcache_tstamp = sa.Column(sa.DateTime)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def capcache(self):
        return (
            self.capcache_json is not None
            and self.capcache_xml is not None
            and self.capcache_tstamp is not None
        )

    def request_wms(self, request, query=None):
        capcache = self.capcache_dict
        url = (capcache.get("urls", {}).get(request) if capcache else None) or self.url
        up = urlparse(url, allow_fragments=False)

        query_main = dict(parse_qsl(up.query))
        query_main["service"] = "WMS"
        query_main["request"] = request
        query_main["version"] = self.version
        if query is not None:
            query_main.update(query)

        # ArcGIS server requires that space is url-encoded as "%20"
        query_encoded = urlencode(query_main, quote_via=quote)

        url = urlunparse((up.scheme, up.netloc, up.path, None, query_encoded, None))

        if self.username and self.password:
            auth = (self.username, self.password)
        else:
            auth = None

        headers = {**env.wmsclient.headers}
        if self.referer:
            headers["Referer"] = self.referer

        try:
            return requests.get(
                url,
                auth=auth,
                headers=headers,
                timeout=env.wmsclient.options["timeout"].total_seconds(),
                verify=not self.insecure,
            )
        except RequestException:
            raise ExternalServiceError

    def capcache_query(self):
        self.capcache_tstamp = utcnow_naive()

        response = self.request_wms("GetCapabilities")
        self.capcache_xml = response.content

        root = etree.parse(BytesIO(self.capcache_xml)).getroot()

        version = root.attrib["version"]
        if version not in WMS_VERSIONS:
            raise ValidationError(f"WMS version {version} not supported.")

        el_cap = find_tag(root, "Capability", must=True)

        data = dict()
        data["formats"] = get_capability_formats(el_cap)
        data["layers"] = get_capability_layers(el_cap, version=version)
        data["srs"] = get_capability_srs(el_cap, version=version)
        data["urls"] = get_capability_urls(el_cap)

        self.capcache_json = data

    def get_info(self):
        s = super()
        result = s.get_info() if hasattr(s, "get_info") else ()
        if self.capcache_tstamp is not None:
            result += (
                (gettext("WMS capabilities"), self.capcache_tstamp),
                (gettext("Image format"), ", ".join(self.capcache_dict["formats"])),
            )
        return result

    def capcache_clear(self):
        self.capcache_xml = None
        self.capcache_json = None
        self.capcache_tstamp = None

    @property
    def capcache_dict(self):
        if self.capcache_tstamp is None:
            return None
        key = (self.id, self.capcache_tstamp)
        if key in _capcache_cache:
            return _capcache_cache[key]
        if (data := self.capcache_json) is not None:
            _capcache_cache[key] = data
        return data


class UrlAttr(SColumn):
    ctypes = CRUTypes(str, str, str)

    def set(self, srlzr: Serializer, value: str, *, create: bool):
        if not url_pattern.match(value):
            raise ValidationError("Service url is not valid.")
        return super().set(srlzr, value, create=create)


VersionEnum = Annotated[
    Literal[tuple(WMS_VERSIONS)],
    TSExport("VersionEnum"),
]


class VersionAttr(SColumn):
    ctypes = CRUTypes(VersionEnum, VersionEnum, VersionEnum)


CapCacheEnum = Annotated[
    Literal["query", "clear"],
    TSExport("CapCacheEnum"),
]


class WMSConnectionLayer(Struct):
    id: str
    title: str
    bbox: tuple[float, float, float, float]


class CapCache(Struct):
    formats: list[str]
    layers: list[WMSConnectionLayer]
    srs: list[str] = field(default_factory=list)


class CapCacheAttr(SAttribute):
    def get(self, srlzr: Serializer) -> CapCache:
        return srlzr.obj.capcache_dict

    def set(self, srlzr: Serializer, value: CapCacheEnum, *, create: bool):
        if value == "query":
            srlzr.obj.capcache_query()
        elif value == "clear":
            srlzr.obj.capcache_clear()


class ConnectionSerializer(Serializer, resource=Connection):
    url = UrlAttr(read=ConnectionScope.read, write=ConnectionScope.write)
    version = VersionAttr(read=ConnectionScope.read, write=ConnectionScope.write)
    username = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    password = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    insecure = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    referer = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    capcache = CapCacheAttr(read=ConnectionScope.connect, write=ConnectionScope.write)


@implementer(IExtentRenderRequest, ITileRenderRequest)
class RenderRequest:
    def __init__(self, style, srs, cond):
        self.style = style
        self.srs = srs
        self.cond = cond

    def render_extent(self, extent, size):
        return self.style.render_image(extent, size)

    def render_tile(self, tile, size):
        extent = self.srs.tile_extent(tile)
        return self.style.render_image(extent, (size, size))


@implementer(IRenderableStyle, IBboxLayer)
class Layer(Resource, SpatialLayerMixin):
    identity = "wmsclient_layer"
    cls_display_name = gettext("WMS layer")

    __scope__ = DataScope

    connection_id = sa.Column(sa.ForeignKey(Resource.id), nullable=False)
    wmslayers = sa.Column(sa.Unicode, nullable=False)
    imgformat = sa.Column(sa.Unicode, nullable=False)
    vendor_params = sa.Column(sa_pg.JSONB, nullable=False, default=dict)
    remote_srs_id = sa.Column(sa.ForeignKey(SRS.id), nullable=False)

    connection = orm.relationship(
        Resource,
        foreign_keys=connection_id,
        cascade="save-update, merge",
    )

    @orm.declared_attr
    def srs(cls):
        return orm.relationship(SRS, foreign_keys=[cls.srs_id], lazy="joined")

    remote_srs = orm.relationship(
        SRS, primaryjoin=remote_srs_id == SRS.id, foreign_keys=[remote_srs_id], lazy="joined"
    )

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def render_request(self, srs, cond=None):
        return RenderRequest(self, srs, cond)

    def _wms_get_map(self, extent, size):
        query = dict(
            layers=self.wmslayers,
            styles="",
            format=self.imgformat,
            bbox=",".join(map(str, extent)),
            width=size[0],
            height=size[1],
            transparent="true",
        )
        query.update(self.vendor_params)

        srs_param = "crs" if self.connection.version == "1.3.0" else "srs"
        query[srs_param] = "EPSG:%d" % self.remote_srs.id
        response = self.connection.request_wms("GetMap", query)

        if response.status_code == 200:
            data = BytesIO(response.content)
            try:
                img = PIL.Image.open(data)
            except IOError:
                raise ExternalServiceError("Image processing error.")
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            return img
        elif response.status_code in (204, 404):
            return None
        else:
            raise ExternalServiceError

    def render_image(self, extent, size):
        if self.remote_srs.id == self.srs.id:
            return self._wms_get_map(extent, size)
        return reproject_render(self._wms_get_map, extent, size, self.srs.wkt, self.remote_srs.wkt)

    # IBboxLayer implementation:
    @property
    def extent(self):
        if not self.connection.capcache():
            self.connection.capcache_query()

        layers = self.wmslayers.split(",")

        bbox = [180.0, 90.0, -180.0, -90.0]
        for layer in self.connection.capcache_dict["layers"]:
            if layer["id"] not in layers:
                continue
            if layer.get("bbox") is None:
                bbox = [-180.0, -90.0, 180.0, 90.0]
                break
            bbox[0] = min(layer["bbox"][0], bbox[0])
            bbox[1] = min(layer["bbox"][1], bbox[1])
            bbox[2] = max(layer["bbox"][2], bbox[2])
            bbox[3] = max(layer["bbox"][3], bbox[3])

        return dict(
            minLon=bbox[0],
            maxLon=bbox[2],
            minLat=bbox[1],
            maxLat=bbox[3],
        )


DataScope.read.require(ConnectionScope.connect, attr="connection", cls=Layer)


class VendorParamsAttr(SColumn):
    ctypes = CRUTypes(dict[str, str], dict[str, str], dict[str, str])


class LayerSerializer(Serializer, resource=Layer):
    connection = SResource(read=ResourceScope.read, write=ResourceScope.update)
    wmslayers = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    imgformat = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    vendor_params = VendorParamsAttr(read=ResourceScope.read, write=ResourceScope.update)
    srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update)
    remote_srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update)
