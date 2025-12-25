import re
from datetime import date, datetime, time
from io import BytesIO
from typing import Annotated, Literal, Union

import requests
import sqlalchemy as sa
import sqlalchemy.orm as orm
from lxml import etree
from osgeo import ogr
from requests.exceptions import RequestException
from shapely.geometry import box
from zope.interface import implementer

from nextgisweb.env import COMP_ID, Base, env, gettext
from nextgisweb.lib import saext
from nextgisweb.lib.geometry import Geometry
from nextgisweb.lib.logging import logger
from nextgisweb.lib.ows import FIELD_TYPE_WFS

from nextgisweb.core.exception import ExternalServiceError, ForbiddenError, ValidationError
from nextgisweb.feature_layer import (
    FIELD_TYPE,
    GEOM_TYPE,
    GEOM_TYPE_OGR_2_GEOM_TYPE,
    Feature,
    FeatureQueryIntersectsMixin,
    FeatureSet,
    FeaureLayerGeometryType,
    IFeatureLayer,
    IFeatureQuery,
    IFeatureQueryFilter,
    IFeatureQueryFilterBy,
    IFeatureQueryIntersects,
    LayerField,
    LayerFieldsMixin,
)
from nextgisweb.jsrealm import TSExport
from nextgisweb.layer import IBboxLayer, SpatialLayerMixin
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

COMPARISON_OPERATORS = {
    "eq": "PropertyIsEqualTo",
    "ne": "PropertyIsNotEqualTo",
    "isnull": "PropertyIsNil",
    "gt": "PropertyIsGreaterThan",
    "ge": "PropertyIsGreaterThanOrEqualTo",
    "lt": "PropertyIsLessThan",
    "le": "PropertyIsLessThanOrEqualTo",
}

layer_identity = COMP_ID + "_layer"

WFS_VERSIONS = (
    "1.0.0",
    "1.1.0",
    "2.0.0",
    "2.0.2",
)

WFS_VERSIONS_SUPPORTED = (
    "2.0.0",
    "2.0.2",
)


class VersionNotSupported(Exception):
    pass


url_pattern = re.compile(
    r"^(https?:\/\/)([a-zа-яё0-9\-._~%]+|\[[a-zа-яё0-9\-._~%!$&\'()*+,;=:]+\])+(:[0-9]+)?(\/[a-zа-яё0-9\-._~%!$&\'()*+,;=:@]+)*\/?(\?[a-zа-яё0-9\-._~%!$&\'()*+,;=:@\/?]*)?$",
    re.IGNORECASE | re.UNICODE,
)

nil_attr = r"{http://www.w3.org/2001/XMLSchema-instance}nil"

NS_WFS = "http://www.opengis.net/wfs/2.0"
NS_FES = "http://www.opengis.net/fes/2.0"
NS_GML = "http://www.opengis.net/gml/3.2"


# TODO: WFS helper module
def find_tags(element, tag):
    return element.xpath('.//*[local-name()="%s"]' % tag)


def ns_trim(value):
    pos = max(value.find("}"), value.rfind(":"))
    return value[pos + 1 :]


def geom_from_gml(el):
    value = etree.tostring(el, encoding="utf-8")
    ogr_geom = ogr.CreateGeometryFromGML(value.decode("utf-8"))
    return Geometry.from_ogr(ogr_geom)


def get_srid(value: str):
    # https://github.com/geopython/OWSLib/blob/297bc48af4f3fb360765f93534742b1ad6b4b570/owslib/crs.py#L1733
    values = value.split(":")
    if value.find("/def/crs/") != 1 or value.find("#") != -1 or len(values) > 1:
        try:
            return int(values[-1])
        except ValueError:
            pass


def fid_int(el_feature, layer_name):
    fid = el_feature.attrib.get(f"{{{NS_GML}}}id")
    if fid is None:
        raise ValidationError("Feature has no ID.")
    # Check pattern 'layer_name_without_namespace.FID' and return FID
    m = re.search(r"^(.*:)?%s\.(\d+)$" % re.sub("^.*:", "", layer_name), fid)
    if m is None:
        raise ValidationError("Feature ID encoding is not supported")
    return int(m.group(2))


def fid_str(fid, layer_name):
    return "%s.%d" % (ns_trim(layer_name), fid)


class WFSConnection(Base, Resource):
    identity = COMP_ID + "_connection"
    cls_display_name = gettext("WFS connection")

    __scope__ = ConnectionScope

    path = sa.Column(sa.Unicode, nullable=False)
    username = sa.Column(sa.Unicode)
    password = sa.Column(sa.Unicode)
    version = sa.Column(saext.Enum(*WFS_VERSIONS), nullable=False)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def request_wfs(self, method, xml_root=None, **kwargs):
        if method == "GET":
            if "params" not in kwargs:
                kwargs["params"] = dict()
            kwargs["params"]["version"] = self.version
            kwargs["params"]["service"] = "WFS"
        elif method == "POST":
            if xml_root is not None:
                xml_root.attrib["version"] = self.version
                xml_root.attrib["service"] = "WFS"
                kwargs["data"] = etree.tostring(xml_root)
        else:
            raise NotImplementedError

        if self.username is not None and self.username.strip() != "":
            kwargs["auth"] = requests.auth.HTTPBasicAuth(self.username, self.password)

        try:
            response = requests.request(
                method,
                self.path,
                headers=env.wfsclient.headers,
                timeout=env.wfsclient.options["timeout"].total_seconds(),
                **kwargs,
            )
        except RequestException:
            raise ExternalServiceError

        if response.status_code < 500:
            root = etree.parse(BytesIO(response.content)).getroot()
            if 200 <= response.status_code < 300:
                return root
            if response.status_code >= 400:
                el_exc = find_tags(root, "Exception")[0]
                if el_exc.attrib.get("exceptionCode") == "VersionNegotiationFailed":
                    raise VersionNotSupported
        raise ExternalServiceError

    def get_capabilities(self):
        root = self.request_wfs(
            "GET",
            params=dict(
                request="GetCapabilities",
                acceptVersions=",".join(reversed(WFS_VERSIONS_SUPPORTED)),
            ),
        )

        version = root.attrib["version"]

        layers = []
        for el in find_tags(root, "FeatureType"):
            if find_tags(el, "NoCRS"):
                continue

            _default = find_tags(el, "DefaultCRS")
            if len(_default) < 1:
                continue

            srid = get_srid(_default[0].text)
            if not isinstance(srid, int):
                continue

            el_bbox = find_tags(el, "WGS84BoundingBox")[0]
            min_lon, min_lat = map(float, find_tags(el_bbox, "LowerCorner")[0].text.split(" "))
            max_lon, max_lat = map(float, find_tags(el_bbox, "UpperCorner")[0].text.split(" "))
            layers.append(
                dict(
                    name=find_tags(el, "Name")[0].text,
                    srid=srid,
                    bbox=(min_lon, min_lat, max_lon, max_lat),
                )
            )

        return dict(version=version, layers=layers)

    def get_fields(self, layer_name):
        root = self.request_wfs(
            "GET",
            params=dict(request="DescribeFeatureType", typeNames=layer_name),
        )
        cplx = find_tags(root, "complexType")[0]

        fields = []
        for el in find_tags(cplx, "element"):
            field_type = el.attrib.get("type")
            if field_type is None:
                restriction = find_tags(cplx, "restriction")[0]
                field_type = restriction.attrib["base"]
            pair = field_type.split(":", maxsplit=1)
            if len(pair) == 2:
                ns_short, wfstype = pair
                ns = root.nsmap[ns_short]
            else:
                wfstype = pair[0]
                ns = root.nsmap[None]
            fields.append(
                dict(
                    name=el.attrib["name"],
                    type=(ns, wfstype),
                )
            )

        return fields

    def get_feature(
        self,
        layer,
        *,
        fid=None,
        filter_=None,
        intersects=None,
        propertyname=None,
        get_count=False,
        limit=None,
        offset=None,
        srs=None,
        add_box=False,
    ):
        req_root = etree.Element(
            etree.QName(NS_WFS, "GetFeature"), nsmap=dict(wfs=NS_WFS, fes=NS_FES)
        )

        __query = etree.Element(etree.QName(NS_WFS, "Query"), dict(typeNames=layer.layer_name))
        req_root.append(__query)

        # Filter {
        __filter = etree.Element(etree.QName(NS_FES, "Filter"))

        if fid is not None:
            __rid = etree.Element(
                etree.QName(NS_FES, "ResourceId"), dict(rid=fid_str(fid, layer.layer_name))
            )
            __filter.append(__rid)

        if filter_ is not None:
            __and = etree.Element(etree.QName(NS_FES, "And"))
            for k, o, v in filter_:
                if o not in COMPARISON_OPERATORS.keys():
                    raise ValidationError("Operator '%s' is not supported." % o)
                __op = etree.Element(etree.QName(NS_FES, COMPARISON_OPERATORS[o]))
                __value_reference = etree.Element(etree.QName(NS_FES, "ValueReference"))
                __value_reference.text = k
                __op.append(__value_reference)
                if o == "isnull":
                    if v == "yes":
                        pass
                    elif v == "no":
                        raise ValidationError(
                            "Value '%s' for operator '%s' is not supported." % (v, o)
                        )
                    else:
                        raise ValueError("Invalid value '%s' for operator '%s'." % (v, o))
                else:
                    __literal = etree.Element(etree.QName(NS_FES, "Literal"))
                    __literal.text = str(v)
                    __op.append(__literal)
                __and.append(__op)
            __filter.append(__and)

        if intersects is not None:
            __intersects = etree.Element(etree.QName(NS_FES, "Intersects"))
            __value_reference = etree.Element(etree.QName(NS_FES, "ValueReference"))
            __value_reference.text = layer.column_geom
            __intersects.append(__value_reference)
            if intersects.srid is not None:
                srs_intersects = SRS.filter_by(id=intersects.srid).one()
            else:
                srs_intersects = layer.srs
            osr_intersects = srs_intersects.to_osr()
            geom = intersects.ogr
            geom.AssignSpatialReference(osr_intersects)
            geom_gml = geom.ExportToGML(
                [
                    "FORMAT=GML32",
                    "NAMESPACE_DECL=YES",
                    "SRSNAME_FORMAT=SHORT",
                    "GMLID=filter-geom-1",
                ]
            )
            __gml = etree.fromstring(geom_gml)
            __intersects.append(__gml)
            __filter.append(__intersects)

        if len(__filter) > 0:
            __query.append(__filter)
        # } Filter

        if limit is not None:
            req_root.attrib["count"] = str(limit)
            if offset is not None:
                req_root.attrib["startIndex"] = str(offset)

        if get_count:
            # Try cheap request first using resultType=hits
            req_root.attrib["resultType"] = "hits"
            root = self.request_wfs("POST", xml_root=req_root)
            if (n_returned := root.attrib["numberMatched"]) != "unknown":
                count = int(n_returned)
            else:
                del req_root.attrib["resultType"]
                root = self.request_wfs("POST", xml_root=req_root)
                count = len(find_tags(root, "member"))
            return None, count

        if propertyname is not None:
            if add_box and layer.column_geom not in propertyname:
                propertyname.append(layer.column_geom)
            for p in propertyname:
                __p = etree.Element(etree.QName(NS_WFS, "PropertyName"))
                __p.text = p
                __query.append(__p)

        if srs is not None:
            __query.attrib["srsName"] = "EPSG:%d" % srs

        root = self.request_wfs("POST", xml_root=req_root)

        _members = find_tags(root, "member")

        features = []
        for _member in _members:
            _feature = _member[0]

            fid = fid_int(_feature, layer.layer_name)
            fields = dict()
            geom = None
            for _property in _feature:
                key = ns_trim(_property.tag)

                if key == "boundedBy":
                    continue

                is_nil = _property.attrib.get(nil_attr, "false") == "true"

                if key == layer.column_geom:
                    if not is_nil:
                        geom = geom_from_gml(_property[0])
                    continue

                try:
                    layer_field = layer.field_by_keyname(key)
                except KeyError:
                    continue

                orig_datatype = layer_field.orig_datatype
                if is_nil:
                    value = None
                elif orig_datatype in (
                    "XSD_INT",
                    "XSD_INTEGER",
                    "XSD_LONG",
                ):
                    value = int(_property.text)
                elif orig_datatype == "XSD_DOUBLE":
                    value = float(_property.text)
                elif orig_datatype in ("XSD_STRING", "XSD_DECIMAL"):
                    if _property.text is None:
                        value = ""
                    else:
                        value = _property.text
                elif orig_datatype == "XSD_DATE":
                    value = date.fromisoformat(_property.text)
                elif orig_datatype == "XSD_TIME":
                    value = time.fromisoformat(_property.text)
                elif orig_datatype == "XSD_DATETIME":
                    value = datetime.fromisoformat(_property.text)
                elif orig_datatype == "GML_TIME_INSTANT":
                    _tp = find_tags(_property, "timePosition")[0]
                    value = datetime.fromisoformat(_tp.text)
                else:
                    raise NotImplementedError
                fields[key] = value

            if add_box and geom is not None:
                _box = box(*geom.bounds)
            else:
                _box = None

            features.append(
                Feature(
                    layer=layer,
                    id=fid,
                    fields=fields,
                    geom=geom,
                    box=_box,
                )
            )

        return features, len(features)


class PathAttr(SColumn):
    ctypes = CRUTypes(str, str, str)

    def set(self, srlzr: Serializer, value: str, *, create: bool):
        if not url_pattern.match(value):
            raise ValidationError("Invalid WFS service URL")
        return super().set(srlzr, value, create=create)


VersionEnum = Annotated[
    Union[tuple(Literal[i] for i in WFS_VERSIONS_SUPPORTED)],  # type: ignore
    TSExport("VersionEnum"),
]


class VersionAttr(SColumn):
    ctypes = CRUTypes(VersionEnum, VersionEnum, VersionEnum)

    def set(self, srlzr: Serializer, value: str, *, create: bool):
        result = super().set(srlzr, value, create=create)
        connection = srlzr.obj
        try:
            result = connection.get_capabilities()
            # Some servers do not return version error on GetCapabilities request
            if result["version"] != value:
                raise VersionNotSupported
        except VersionNotSupported:
            raise ValidationError("Version {} not supported.".format(connection.version))
        return result


class WFSConnectionSerializer(Serializer, resource=WFSConnection):
    username = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    password = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    path = PathAttr(read=ConnectionScope.read, write=ConnectionScope.write)
    version = VersionAttr(read=ConnectionScope.read, write=ConnectionScope.write)


class WFSLayerField(Base, LayerField):
    identity = layer_identity

    __tablename__ = LayerField.__tablename__ + "_" + identity
    __mapper_args__ = dict(polymorphic_identity=identity)

    id = sa.Column(sa.ForeignKey(LayerField.id), primary_key=True)
    column_name = sa.Column(sa.Unicode, nullable=False)
    orig_datatype = sa.Column(saext.Enum(*FIELD_TYPE_WFS.keys()), nullable=False)


@implementer(IFeatureLayer, IBboxLayer)
class WFSLayer(Base, Resource, SpatialLayerMixin, LayerFieldsMixin):
    identity = layer_identity
    cls_display_name = gettext("WFS layer")

    __scope__ = DataScope

    connection_id = sa.Column(sa.ForeignKey(WFSConnection.id), nullable=False)
    layer_name = sa.Column(sa.Unicode, nullable=False)
    column_geom = sa.Column(sa.Unicode, nullable=False)
    geometry_type = sa.Column(saext.Enum(*GEOM_TYPE.enum), nullable=False)
    geometry_srid = sa.Column(sa.Integer, nullable=False)

    __field_class__ = WFSLayerField

    connection = orm.relationship(
        WFSConnection,
        foreign_keys=connection_id,
        cascade="save-update, merge",
    )

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def setup(self):
        fdata = dict()
        for f in self.fields:
            fdata[f.keyname] = dict(display_name=f.display_name, grid_visibility=f.grid_visibility)

        for f in list(self.fields):
            self.fields.remove(f)

        self.feature_label_field = None

        for field in self.connection.get_fields(self.layer_name):
            if field["name"] == self.column_geom:
                continue

            for k, v in FIELD_TYPE_WFS.items():
                if field["type"] == v:
                    orig_datatype = k
                    if k in ("XSD_INT", "XSD_INTEGER"):
                        datatype = FIELD_TYPE.INTEGER
                    elif k == "XSD_LONG":
                        datatype = FIELD_TYPE.BIGINT
                    elif k == "XSD_DOUBLE":
                        datatype = FIELD_TYPE.REAL
                    elif k in ("XSD_STRING", "XSD_DECIMAL"):
                        datatype = FIELD_TYPE.STRING
                    elif k == "XSD_DATE":
                        datatype = FIELD_TYPE.DATE
                    elif k == "XSD_TIME":
                        datatype = FIELD_TYPE.TIME
                    elif k in ("XSD_DATETIME", "GML_TIME_INSTANT"):
                        datatype = FIELD_TYPE.DATETIME
                    else:
                        raise NotImplementedError
                    break
            else:
                logger.warning("Unknown data type: {%s}%s" % field["type"])
                continue

            fopts = dict(display_name=field["name"])
            fopts.update(fdata.get(field["name"], dict()))
            self.fields.append(
                WFSLayerField(
                    keyname=field["name"],
                    datatype=datatype,
                    orig_datatype=orig_datatype,
                    column_name=field["name"],
                    **fopts,
                )
            )

        # Check feature id readable
        features, count = self.connection.get_feature(self, limit=1)

        if self.geometry_type is None:
            example_feature = features[0]
            self.geometry_type = GEOM_TYPE_OGR_2_GEOM_TYPE[
                example_feature.geom.ogr.GetGeometryType()
            ]

    # IFeatureLayer

    @property
    def feature_query(self):
        class BoundFeatureQuery(FeatureQueryBase):
            layer = self
            srs_supported = (self.geometry_srid,)

        return BoundFeatureQuery

    def field_by_keyname(self, keyname):
        for f in self.fields:
            if f.keyname == keyname:
                return f

        raise KeyError("Field '%s' not found!" % keyname)

    # IBboxLayer

    @property
    def extent(self):
        capabilities = self.connection.get_capabilities()
        for layer in capabilities["layers"]:
            if layer["name"] == self.layer_name:
                bbox = layer["bbox"]
                return dict(
                    minLon=bbox[0],
                    minLat=bbox[1],
                    maxLon=bbox[2],
                    maxLat=bbox[3],
                )
        raise ValueError(f"Layer {self.layer_name} not found in Capabilities.")


class GeometryTypeAttr(SAttribute):
    ctypes = CRUTypes(
        FeaureLayerGeometryType | None,
        FeaureLayerGeometryType,
        FeaureLayerGeometryType | None,
    )


class GeometrySridAttr(SAttribute):
    ctypes = CRUTypes(int | None, int, int | None)


class FieldsAttr(SAttribute):
    def set(
        self,
        srlzr: Serializer,
        value: Literal["update"] | Literal["keep"],
        *,
        create: bool,
    ):
        if value == "update":
            if srlzr.obj.connection.has_permission(ConnectionScope.connect, srlzr.user):
                srlzr.obj.setup()
            else:
                raise ForbiddenError


class WFSLayerSerializer(Serializer, resource=WFSLayer):
    connection = SResource(read=ResourceScope.read, write=ResourceScope.update)
    layer_name = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    column_geom = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    geometry_type = GeometryTypeAttr(read=ResourceScope.read, write=ResourceScope.update)
    geometry_srid = GeometrySridAttr(read=ResourceScope.read, write=ResourceScope.update)
    srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update)

    fields = FieldsAttr(read=None, write=ResourceScope.update)


@implementer(
    IFeatureQuery,
    IFeatureQueryFilter,
    IFeatureQueryFilterBy,
    IFeatureQueryIntersects,
)
class FeatureQueryBase(FeatureQueryIntersectsMixin):
    def __init__(self):
        self._srs = None
        self._geom = False
        self._box = False
        self._fields = None
        self._limit = None
        self._offset = None

        self._filter = None

        self._filter_by = None

        self._intersects = None

    def fields(self, *args):
        self._fields = args

    def limit(self, limit, offset=0):
        self._limit = limit
        self._offset = offset

    def geom(self):
        self._geom = True

    def geom_format(self, geom_format):
        # Initialized with OGR only
        pass

    def srs(self, srs):
        self._srs = srs

    def box(self):
        self._box = True

    def filter(self, *args):
        self._filter = args

    def filter_by(self, **kwargs):
        self._filter_by = kwargs

    def __call__(self):
        params = dict()
        if self._filter_by is not None:
            if "id" in self._filter_by:
                params["fid"] = self._filter_by.pop("id")
            if len(self._filter_by) > 0:
                if self._filter is None:
                    self._filter = list()
                for k, v in self._filter_by.items():
                    self._filter.append((k, "eq", v))
        if self._filter is not None and len(self._filter) > 0:
            params["filter_"] = self._filter
        if self._limit is not None:
            params["limit"] = self._limit
            params["offset"] = self._offset
        if self._srs is not None:
            params["srs"] = self._srs.id
        else:
            params["srs"] = self.layer.srs_id
        if self._box:
            params["add_box"] = True
        if self._intersects:
            params["intersects"] = self._intersects

        if not self._geom and self._fields is not None:
            params["propertyname"] = self._fields
        elif not self._geom:
            params["propertyname"] = [f.keyname for f in self.layer.fields]
        elif self._fields is not None:
            params["propertyname"] = [*self._fields, self.layer.column_geom]

        class QueryFeatureSet(FeatureSet):
            layer = self.layer

            def __init__(self):
                super().__init__()
                self._features = None
                self._count = None

            def __iter__(self):
                if self._features is None:
                    self._features, self._count = self.layer.connection.get_feature(
                        self.layer, **params
                    )
                for feature in self._features:
                    yield feature

            @property
            def total_count(self):
                if self._count is None:
                    _none_features, self._count = self.layer.connection.get_feature(
                        self.layer, get_count=True, **params
                    )

                if self._count is None:
                    raise ExternalServiceError(
                        message="Couldn't determine feature count in the current request."
                    )
                return self._count

        return QueryFeatureSet()
