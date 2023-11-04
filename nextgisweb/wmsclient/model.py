import json
import re
from datetime import datetime
from io import BytesIO

import PIL
import requests
from lxml import etree
from owslib.map.common import WMSCapabilitiesReader
from owslib.wms import WebMapService
from pyramid.url import urlencode
from requests.exceptions import RequestException
from zope.interface import implementer

from nextgisweb.env import Base, _, env
from nextgisweb.lib import db

from nextgisweb.core.exception import ExternalServiceError, ValidationError
from nextgisweb.layer import IBboxLayer, SpatialLayerMixin
from nextgisweb.render import IExtentRenderRequest, IRenderableStyle, ITileRenderRequest
from nextgisweb.resource import (
    ConnectionScope,
    DataScope,
    DataStructureScope,
    Resource,
    ResourceGroup,
    Serializer,
)
from nextgisweb.resource import SerializedProperty as SP
from nextgisweb.resource import SerializedRelationship as SR
from nextgisweb.resource import SerializedResourceRelationship as SRR

Base.depends_on("resource")

WMS_VERSIONS = ("1.1.1", "1.3.0")

url_pattern = re.compile(
    r"^(https?:\/\/)([a-zа-яё0-9\-._~%]+|\[[a-zа-яё0-9\-._~%!$&\'()*+,;=:]+\])+(:[0-9]+)?(\/[a-zа-яё0-9\-._~%!$&\'()*+,;=:@]+)*\/?(\?[a-zа-яё0-9\-._~%!$&\'()*+,;=:@\/?]*)?$",
    re.IGNORECASE | re.UNICODE,
)


class Connection(Base, Resource):
    identity = "wmsclient_connection"
    cls_display_name = _("WMS connection")

    __scope__ = ConnectionScope

    url = db.Column(db.Unicode, nullable=False)
    version = db.Column(db.Enum(*WMS_VERSIONS), nullable=False)
    username = db.Column(db.Unicode)
    password = db.Column(db.Unicode)

    capcache_xml = db.deferred(db.Column(db.Unicode))
    capcache_json = db.deferred(db.Column(db.Unicode))
    capcache_tstamp = db.Column(db.DateTime)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def capcache(self):
        return (
            self.capcache_json is not None
            and self.capcache_xml is not None
            and self.capcache_tstamp is not None
        )

    def capcache_query(self):
        self.capcache_tstamp = datetime.utcnow()
        reader = WMSCapabilitiesReader(
            self.version,
            url=self.url,
            un=self.username,
            pw=self.password,
            headers=env.wmsclient.headers,
        )
        try:
            xml = reader.read(self.url)
        except RequestException:
            raise ExternalServiceError("Could not read WMS capabilities.")
        self.capcache_xml = etree.tostring(xml)

        service = WebMapService(
            url=self.url,
            version=self.version,
            username=self.username,
            password=self.password,
            xml=self.capcache_xml,
        )

        layers = []
        for lid, layer in service.contents.items():
            layers.append(
                {
                    "id": lid,
                    "title": layer.title,
                    "index": [int(i) for i in layer.index.split(".")],
                    "bbox": layer.boundingBoxWGS84,  # may be None
                }
            )

        layers.sort(key=lambda i: i["index"])

        for layer in layers:
            del layer["index"]

        data = dict(formats=service.getOperationByName("GetMap").formatOptions, layers=layers)

        self.capcache_json = json.dumps(data, ensure_ascii=False)

    def get_info(self):
        s = super()
        result = s.get_info() if hasattr(s, "get_info") else ()
        if self.capcache_tstamp is not None:
            result += (
                (_("WMS capabilities"), self.capcache_tstamp),
                (_("Image format"), ", ".join(self.capcache_dict["formats"])),
            )
        return result

    def capcache_clear(self):
        self.capcache_xml = None
        self.capcache_json = None
        self.capcache_tstamp = None

    @property
    def capcache_dict(self):
        if not self.capcache():
            return None

        return json.loads(self.capcache_json)


class _url_attr(SP):
    def setter(self, srlzr, value):
        if not url_pattern.match(value):
            raise ValidationError("Service url is not valid.")

        super().setter(srlzr, value)


class _capcache_attr(SP):
    def getter(self, srlzr):
        return srlzr.obj.capcache_dict if srlzr.obj.capcache() else None

    def setter(self, srlzr, value):
        if value == "query":
            srlzr.obj.capcache_query()
        elif value == "clear":
            srlzr.obj.capcache_clear()
        else:
            raise ValidationError("Invalid capcache value!")


class ConnectionSerializer(Serializer):
    identity = Connection.identity
    resclass = Connection

    _defaults = dict(read=ConnectionScope.read, write=ConnectionScope.write)

    url = _url_attr(**_defaults)
    version = SP(**_defaults)
    username = SP(**_defaults)
    password = SP(**_defaults)

    capcache = _capcache_attr(read=ConnectionScope.connect, write=ConnectionScope.connect)


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
class Layer(Base, Resource, SpatialLayerMixin):
    identity = "wmsclient_layer"
    cls_display_name = _("WMS layer")

    __scope__ = (DataStructureScope, DataScope)

    connection_id = db.Column(db.ForeignKey(Resource.id), nullable=False)
    wmslayers = db.Column(db.Unicode, nullable=False)
    imgformat = db.Column(db.Unicode, nullable=False)
    vendor_params = db.Column(db.JSONB, nullable=False, default=dict)

    connection = db.relationship(
        Resource,
        foreign_keys=connection_id,
        cascade="save-update, merge",
    )

    @db.validates("vendor_params")
    def _validate_vendor_params(self, key, value):
        for v in value.values():
            if not isinstance(v, str):
                raise ValidationError(message="Vendor params must be strings only.")
        return value

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def render_request(self, srs, cond=None):
        return RenderRequest(self, srs, cond)

    def render_image(self, extent, size):
        query = dict(
            service="WMS",
            request="GetMap",
            version=self.connection.version,
            layers=self.wmslayers,
            styles="",
            format=self.imgformat,
            bbox=",".join(map(str, extent)),
            width=size[0],
            height=size[1],
            transparent="true",
        )

        # Vendor-specific parameters
        query.update(self.vendor_params)

        # In the GetMap operation the srs parameter is called crs in 1.3.0.
        srs = "crs" if self.connection.version == "1.3.0" else "srs"
        query[srs] = "EPSG:%d" % self.srs.id

        auth = None
        username = self.connection.username
        password = self.connection.password
        if username and password:
            auth = (username, password)

        sep = "&" if "?" in self.connection.url else "?"

        # ArcGIS server requires that space is url-encoded as "%20"
        # but it does not accept space encoded as "+".
        # It is always safe to replace spaces with "%20".
        url = self.connection.url + sep + urlencode(query).replace("+", "%20")

        try:
            response = requests.get(
                url,
                auth=auth,
                headers=env.wmsclient.headers,
                timeout=env.wmsclient.options["timeout"].total_seconds(),
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


class LayerSerializer(Serializer):
    identity = Layer.identity
    resclass = Layer

    _defaults = dict(read=DataStructureScope.read, write=DataStructureScope.write)

    connection = SRR(**_defaults)
    wmslayers = SP(**_defaults)
    imgformat = SP(**_defaults)
    srs = SR(**_defaults)
    vendor_params = SP(**_defaults)
