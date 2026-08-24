import re
from datetime import datetime
from io import BytesIO
from typing import TYPE_CHECKING, Annotated, Literal
from urllib.parse import parse_qsl, quote, urlencode, urlparse, urlunparse

import requests
import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
import sqlalchemy.orm as orm
from cachetools import LRUCache
from lxml import etree
from msgspec import Struct, field
from PIL import Image
from requests.exceptions import RequestException
from sqlalchemy.orm import Mapped, mapped_column
from zope.interface import implementer

from nextgisweb.env import Base, gettext, gettextf
from nextgisweb.lib import saext
from nextgisweb.lib.apitype import make_literal
from nextgisweb.lib.datetime import utcnow_naive
from nextgisweb.lib.logging import logger
from nextgisweb.lib.pilhelper import reproject_render
from nextgisweb.lib.reqext import response_diagnostics

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

_WMS_EXCEPTION_TAGS = (
    "ServiceException",
    "{http://www.opengis.net/ogc}ServiceException",
)


def _extract_wms_error(content: bytes) -> tuple[str | None, str | None]:
    """Extract exception code and message from a WMS service exception document

    Both WMS 1.1.1 and 1.3.0 use the same ServiceExceptionReport format,
    so a single parser covers both versions."""

    def _clean(value: str | None) -> str | None:
        return value.strip() or None if value else None

    try:
        root = etree.fromstring(content)
    except etree.XMLSyntaxError:
        return None, None

    for tag in _WMS_EXCEPTION_TAGS:
        # A ServiceExceptionReport may contain multiple ServiceException
        # elements, but we only use the first one.
        el = root.find(tag)
        if el is not None:
            code = _clean(el.attrib.get("code"))
            text = _clean(el.text)
            if code is not None or text is not None:
                return code, text

    return None, None


def _wms_error_message(code: str | None, msg: str | None) -> str | None:
    if msg and code:
        return f"{msg} ({code})"
    return msg or code


WMS_VERSIONS = ("1.1.1", "1.3.0")

url_pattern = re.compile(
    r"^(https?:\/\/)([a-zа-яё0-9\-._~%]+|\[[a-zа-яё0-9\-._~%!$&\'()*+,;=:]+\])+(:[0-9]+)?(\/[a-zа-яё0-9\-._~%!$&\'()*+,;=:@]+)*\/?(\?[a-zа-яё0-9\-._~%!$&\'()*+,;=:@\/?]*)?$",
    re.IGNORECASE | re.UNICODE,
)

_capcache_cache: LRUCache = LRUCache(maxsize=64)


class WMSConnection(Resource):
    identity = "wmsclient_connection"
    cls_display_name = gettext("WMS connection")

    __scope__ = ConnectionScope

    url: Mapped[str] = mapped_column(sa.Unicode)
    version: Mapped[str] = mapped_column(saext.Enum(*WMS_VERSIONS))
    username: Mapped[str | None] = mapped_column(sa.Unicode)
    password: Mapped[str | None] = mapped_column(sa.Unicode)
    insecure: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    referer: Mapped[str | None] = mapped_column(sa.Unicode)

    capcache_xml: Mapped[str | None] = orm.deferred(mapped_column(sa.Unicode))
    capcache_json: Mapped[dict | None] = orm.deferred(mapped_column(sa_pg.JSONB))
    capcache_tstamp: Mapped[datetime | None] = mapped_column(sa.DateTime)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def capcache(self):
        return (
            self.capcache_json is not None
            and self.capcache_xml is not None
            and self.capcache_tstamp is not None
        )

    def request_wms(self, request: str, query=None):
        from .component import WMSClientComponent

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

        headers = {**WMSClientComponent.current().headers}
        if self.referer:
            headers["Referer"] = self.referer

        try:
            return requests.get(
                url,
                auth=auth,
                headers=headers,
                timeout=WMSClientComponent.current().options["timeout"].total_seconds(),
                verify=not self.insecure,
            )
        except RequestException as exc:
            logger.error("External service request failed: %s: %s", type(exc).__name__, exc)
            raise ExternalServiceError(
                gettext("Unable to get a response from the remote server."),
                detail=f"{type(exc).__name__}.",
            ) from exc

    def capcache_query(self):
        self.capcache_tstamp = utcnow_naive()

        response = self.request_wms("GetCapabilities")
        self.capcache_xml = response.content

        try:
            root = etree.parse(BytesIO(self.capcache_xml)).getroot()
        except etree.XMLSyntaxError as exc:
            raise ExternalServiceError(
                gettext("Failed to parse the XML response from the remote server."),
                data=response_diagnostics(response),
            ) from exc

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


VersionEnum = (
    str
    if TYPE_CHECKING
    else Annotated[
        make_literal(WMS_VERSIONS),
        TSExport("VersionEnum"),
    ]
)


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


class WMSConnectionSerializer(Serializer, resource=WMSConnection):
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
class WMSLayer(Resource, SpatialLayerMixin):
    identity = "wmsclient_layer"
    cls_display_name = gettext("WMS layer")

    __scope__ = DataScope

    connection_id: Mapped[int] = mapped_column(sa.ForeignKey(Resource.id))
    wmslayers: Mapped[str] = mapped_column(sa.Unicode)
    imgformat: Mapped[str] = mapped_column(sa.Unicode)
    vendor_params: Mapped[dict] = mapped_column(sa_pg.JSONB, default=dict)
    remote_srs_id: Mapped[int] = mapped_column(sa.ForeignKey(SRS.id))

    connection: Mapped[WMSConnection] = orm.relationship(
        Resource,
        foreign_keys=connection_id,
        cascade="save-update,merge",
    )

    @orm.declared_attr
    def srs(cls):
        return orm.relationship(SRS, foreign_keys=[cls.srs_id], lazy="joined")

    remote_srs: Mapped[SRS] = orm.relationship(
        primaryjoin=remote_srs_id == SRS.id,
        foreign_keys=[remote_srs_id],
        lazy="joined",
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
                img = Image.open(data)
            except OSError as exc:
                code, msg = _extract_wms_error(response.content)
                if (message := _wms_error_message(code, msg)) is not None:
                    raise ExternalServiceError(
                        message, data=response_diagnostics(response)
                    ) from exc
                raise ExternalServiceError(
                    gettext("Image processing error."),
                    detail=gettextf("Response Content-Type is {}.")(
                        response.headers.get("Content-Type")
                    ),
                ) from exc
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            return img
        elif response.status_code in (204, 404):
            return None
        else:
            code, msg = _extract_wms_error(response.content)
            if (message := _wms_error_message(code, msg)) is not None:
                raise ExternalServiceError(message, data=response_diagnostics(response))
            raise ExternalServiceError(
                gettextf("The remote server returned an unexpected HTTP status code ({}).")(
                    response.status_code
                ),
                data=response_diagnostics(response),
            )

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


DataScope.read.require(ConnectionScope.connect, attr="connection", cls=WMSLayer)


class VendorParamsAttr(SColumn):
    ctypes = CRUTypes(dict[str, str], dict[str, str], dict[str, str])


class WMSLayerSerializer(Serializer, resource=WMSLayer):
    connection = SResource(read=ResourceScope.read, write=ResourceScope.update)
    wmslayers = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    imgformat = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    vendor_params = VendorParamsAttr(read=ResourceScope.read, write=ResourceScope.update)
    srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update)
    remote_srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update)
