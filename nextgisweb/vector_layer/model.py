# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json
import uuid
import types
import zipfile
import tempfile
import shutil
import ctypes
from datetime import datetime, time, date
import six

from zope.interface import implementer
from osgeo import ogr, osr

from sqlalchemy.sql import ColumnElement
from sqlalchemy.ext.compiler import compiles

import geoalchemy2 as ga
import sqlalchemy.sql as sql
from sqlalchemy import (
    event,
    func,
    cast
)

from ..event import SafetyEvent
from .. import db
from ..resource import (
    Resource,
    DataScope,
    DataStructureScope,
    Serializer,
    SerializedProperty as SP,
    SerializedRelationship as SR,
    ResourceGroup)
from ..resource.exception import ValidationError, ResourceError
from ..env import env
from ..geometry import geom_from_wkb, box
from ..models import declarative_base, DBSession
from ..layer import SpatialLayerMixin, IBboxLayer
from ..compat import lru_cache

from ..feature_layer import (
    Feature,
    FeatureSet,
    LayerField,
    LayerFieldsMixin,
    GEOM_TYPE,
    GEOM_TYPE_OGR,
    FIELD_TYPE,
    FIELD_TYPE_OGR,
    IFeatureLayer,
    IWritableFeatureLayer,
    IFeatureQuery,
    IFeatureQueryFilter,
    IFeatureQueryFilterBy,
    IFeatureQueryLike,
    IFeatureQueryIntersects,
    IFeatureQueryOrderBy,
    IFeatureQueryClipByBox,
    IFeatureQuerySimplify,
    on_data_change,
    query_feature_or_not_found)

from .util import _


GEOM_TYPE_DB = (
    'POINT', 'LINESTRING', 'POLYGON',
    'MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON',
    'POINTZ', 'LINESTRINGZ', 'POLYGONZ',
    'MULTIPOINTZ', 'MULTILINESTRINGZ', 'MULTIPOLYGONZ',
)

GEOM_TYPE_DISPLAY = (
    _("Point"), _("Line"), _("Polygon"),
    _("Multipoint"), _("Multiline"), _("Multipolygon"),
    _("Point Z"), _("Line Z"), _("Polygon Z"),
    _("Multipoint Z"), _("Multiline Z"), _("Multipolygon Z"),
)

FIELD_TYPE_DB = (
    db.Integer,
    db.BigInteger,
    db.Float,
    db.Unicode,
    db.Date,
    db.Time,
    db.DateTime)

FIELD_FORBIDDEN_NAME = ("id", "geom")

_GEOM_OGR_2_TYPE = dict(zip(GEOM_TYPE_OGR, GEOM_TYPE.enum))
_GEOM_TYPE_2_DB = dict(zip(GEOM_TYPE.enum, GEOM_TYPE_DB))

_FIELD_TYPE_2_ENUM = dict(zip(FIELD_TYPE_OGR, FIELD_TYPE.enum))
_FIELD_TYPE_2_DB = dict(zip(FIELD_TYPE.enum, FIELD_TYPE_DB))

Base = declarative_base()


class FieldDef(object):

    def __init__(self, key, keyname, datatype, uuid, display_name=None):
        self.key = key
        self.keyname = keyname
        self.datatype = datatype
        self.uuid = uuid
        self.display_name = display_name


class TableInfo(object):

    def __init__(self, srs_id):
        self.srs_id = srs_id
        self.metadata = None
        self.table = None
        self.model = None

    @classmethod
    def from_ogrlayer(cls, ogrlayer, srs_id, strdecode):
        self = cls(srs_id)

        ltype = ogrlayer.GetGeomType()
        self.geometry_type = _GEOM_OGR_2_TYPE[ltype]

        is_multi = self.geometry_type in GEOM_TYPE.is_multi
        has_z = self.geometry_type in GEOM_TYPE.has_z

        if not is_multi or not has_z:
            for feature in ogrlayer:
                geom = feature.GetGeometryRef()
                gtype = geom.GetGeometryType()
                if ltype != gtype:
                    if not is_multi and (
                        ltype in (ogr.wkbPoint, ogr.wkbPoint25D) and gtype in (ogr.wkbMultiPoint, ogr.wkbMultiPoint25D)  # NOQA: E501
                        or ltype in (ogr.wkbLineString, ogr.wkbLineString25D) and gtype in (ogr.wkbMultiLineString, ogr.wkbMultiLineString25D)  # NOQA: E501, W503
                        or ltype in (ogr.wkbPolygon, ogr.wkbPolygon25D) and gtype in (ogr.wkbMultiPolygon, ogr.wkbMultiPolygon25D)  # NOQA: E501, W503
                    ):
                        self.geometry_type = _GEOM_OGR_2_TYPE[gtype]
                        ltype = gtype
                        is_multi = True

                    if not has_z and (
                        ltype in (ogr.wkbPoint, ogr.wkbMultiPoint) and gtype in (ogr.wkbPoint25D, ogr.wkbMultiPoint25D)  # NOQA: E501
                        or ltype in (ogr.wkbLineString, ogr.wkbMultiLineString) and gtype in (ogr.wkbLineString25D, ogr.wkbMultiLineString25D)  # NOQA: E501, W503
                        or ltype in (ogr.wkbPolygon, ogr.wkbMultiPolygon) and gtype in (ogr.wkbPolygon25D, ogr.wkbMultiPolygon25D)  # NOQA: E501, W503
                    ):
                        self.geometry_type = _GEOM_OGR_2_TYPE[gtype]
                        ltype = gtype
                        has_z = True

                if is_multi and has_z:
                    break

            ogrlayer.ResetReading()

        self.fields = []

        defn = ogrlayer.GetLayerDefn()
        for i in range(defn.GetFieldCount()):
            fld_defn = defn.GetFieldDefn(i)

            # TODO: Fix invalid field names as done for attributes.
            fld_name = strdecode(fld_defn.GetNameRef())
            if fld_name.lower() in FIELD_FORBIDDEN_NAME:
                raise VE(_("Field name is forbidden: '%s'. Please remove or rename it.") % fld_name)  # NOQA: E501

            fld_type = None
            fld_type_ogr = fld_defn.GetType()

            if fld_type_ogr in (ogr.OFTRealList,
                                ogr.OFTStringList,
                                ogr.OFTIntegerList,
                                ogr.OFTInteger64List):
                fld_type = FIELD_TYPE.STRING

            if fld_type is None:
                try:
                    fld_type = _FIELD_TYPE_2_ENUM[fld_type_ogr]
                except KeyError:
                    raise VE(_("Unsupported field type: %r.") %
                             fld_defn.GetTypeName())

            uid = str(uuid.uuid4().hex)
            self.fields.append(FieldDef(
                'fld_%s' % uid,
                fld_name,
                fld_type,
                uid
            ))

        return self

    @classmethod
    def from_fields(cls, fields, srs_id, geometry_type):
        self = cls(srs_id)
        self.geometry_type = geometry_type
        self.fields = []

        for fld in fields:
            uid = str(uuid.uuid4().hex)
            self.fields.append(FieldDef(
                'fld_%s' % uid,
                fld.get('keyname'),
                fld.get('datatype'),
                uid,
                fld.get('display_name')
            ))

        return self

    @classmethod
    def from_layer(cls, layer):
        self = cls(layer.srs_id)

        self.geometry_type = layer.geometry_type

        self.fields = []
        for f in layer.fields:
            self.fields.append(FieldDef(
                'fld_%s' % f.fld_uuid,
                f.keyname,
                f.datatype,
                f.fld_uuid
            ))

        return self

    def __getitem__(self, keyname):
        for f in self.fields:
            if f.keyname == keyname:
                return f

    def setup_layer(self, layer):
        layer.geometry_type = self.geometry_type

        layer.fields = []
        for f in self.fields:
            if f.display_name is None:
                f.display_name = f.keyname

            layer.fields.append(VectorLayerField(
                keyname=f.keyname,
                datatype=f.datatype,
                display_name=f.display_name,
                fld_uuid=f.uuid
            ))

    def setup_metadata(self, tablename=None):
        metadata = db.MetaData(schema='vector_layer' if tablename else None)
        geom_fldtype = _GEOM_TYPE_2_DB[self.geometry_type]

        class model(object):
            def __init__(self, **kwargs):
                for k, v in six.iteritems(kwargs):
                    setattr(self, k, v)

        table = db.Table(
            tablename if tablename else ('lvd_' + str(uuid.uuid4().hex)),
            metadata, db.Column('id', db.Integer, primary_key=True),
            db.Column('geom', ga.Geometry(
                dimension=2, srid=self.srs_id,
                geometry_type=geom_fldtype)),
            *map(lambda fld: db.Column(fld.key, _FIELD_TYPE_2_DB[
                fld.datatype]), self.fields)
        )

        db.mapper(model, table)

        self.metadata = metadata
        self.table = table
        self.model = model

    def load_from_ogr(self, ogrlayer, strdecode):
        source_osr = ogrlayer.GetSpatialRef()
        target_osr = osr.SpatialReference()
        target_osr.ImportFromEPSG(self.srs_id)

        transform = osr.CoordinateTransformation(source_osr, target_osr)

        is_multi = self.geometry_type in GEOM_TYPE.is_multi
        has_z = self.geometry_type in GEOM_TYPE.has_z

        for fid, feature in enumerate(ogrlayer):
            geom = feature.GetGeometryRef()

            gtype = geom.GetGeometryType()
            if gtype not in GEOM_TYPE_OGR:
                raise ValidationError(_(
                    "Unknown geometry type: %d (%s).") % (
                    gtype, ogr.GeometryTypeToName(gtype)))

            geom.Transform(transform)

            # Force single geometries to multi
            if is_multi:
                if gtype in (ogr.wkbPoint, ogr.wkbPoint25D):
                    geom = ogr.ForceToMultiPoint(geom)
                elif gtype in (ogr.wkbLineString, ogr.wkbLineString25D):
                    geom = ogr.ForceToMultiLineString(geom)
                elif gtype in (ogr.wkbPolygon, ogr.wkbPolygon25D):
                    geom = ogr.ForceToMultiPolygon(geom)

            # Force Z
            if has_z and not geom.Is3D():
                geom.Set3D(True)

            # Check geometry type again
            gtype = geom.GetGeometryType()
            if gtype not in GEOM_TYPE_OGR or _GEOM_OGR_2_TYPE[gtype] != self.geometry_type:
                raise ValidationError(_(
                    "Unknown geometry type: %d (%s).") % (
                    gtype, ogr.GeometryTypeToName(gtype)))

            fld_values = dict()
            for i in range(feature.GetFieldCount()):
                fld_type = feature.GetFieldDefnRef(i).GetType()

                if (not feature.IsFieldSet(i) or feature.IsFieldNull(i)):
                    fld_value = None
                elif fld_type == ogr.OFTInteger:
                    fld_value = feature.GetFieldAsInteger(i)
                elif fld_type == ogr.OFTInteger64:
                    fld_value = feature.GetFieldAsInteger64(i)
                elif fld_type == ogr.OFTReal:
                    fld_value = feature.GetFieldAsDouble(i)
                elif fld_type == ogr.OFTDate:
                    year, month, day = feature.GetFieldAsDateTime(i)[0:3]
                    fld_value = date(year, month, day)
                elif fld_type == ogr.OFTTime:
                    hour, minute, second = feature.GetFieldAsDateTime(i)[3:6]
                    fld_value = time(hour, minute, int(second))
                elif fld_type == ogr.OFTDateTime:
                    year, month, day, hour, minute, second, tz = \
                        feature.GetFieldAsDateTime(i)
                    fld_value = datetime(year, month, day,
                                         hour, minute, int(second))
                elif fld_type == ogr.OFTIntegerList:
                    fld_value = json.dumps(feature.GetFieldAsIntegerList(i))
                elif fld_type == ogr.OFTInteger64List:
                    fld_value = json.dumps(feature.GetFieldAsInteger64List(i))
                elif fld_type == ogr.OFTRealList:
                    fld_value = json.dumps(feature.GetFieldAsDoubleList(i))
                elif fld_type == ogr.OFTStringList:
                    # TODO: encoding
                    fld_value = json.dumps(feature.GetFieldAsStringList(i))
                elif fld_type == ogr.OFTString:
                    try:
                        fld_value = strdecode(feature.GetFieldAsString(i))
                    except UnicodeDecodeError:
                        raise ValidationError(_(
                            "It seems like declared and actual attributes "
                            "encodings do not match. Unable to decode "
                            "attribute #%(attr)d of feature #%(feat)d. "
                            "Try declaring different encoding.") % dict(
                            feat=fid, attr=i))

                fld_name = strdecode(feature.GetFieldDefnRef(i).GetNameRef())
                fld_values[self[fld_name].key] = fld_value

            obj = self.model(fid=fid, geom=ga.elements.WKTElement(
                str(geom), srid=self.srs_id), **fld_values)

            DBSession.add(obj)


class VectorLayerField(Base, LayerField):
    identity = 'vector_layer'

    __tablename__ = LayerField.__tablename__ + '_' + identity
    __mapper_args__ = dict(polymorphic_identity=identity)

    id = db.Column(db.ForeignKey(LayerField.id), primary_key=True)
    fld_uuid = db.Column(db.Unicode(32), nullable=False)


@implementer(IFeatureLayer, IWritableFeatureLayer, IBboxLayer)
class VectorLayer(Base, Resource, SpatialLayerMixin, LayerFieldsMixin):
    identity = 'vector_layer'
    cls_display_name = _("Vector layer")

    __scope__ = DataScope

    tbl_uuid = db.Column(db.Unicode(32), nullable=False)
    geometry_type = db.Column(db.Enum(*GEOM_TYPE.enum), nullable=False)

    __field_class__ = VectorLayerField

    # events
    before_feature_create = SafetyEvent()  # args: resource, feature
    after_feature_create = SafetyEvent()   # args: resource, feature_id

    before_feature_update = SafetyEvent()  # args: resource, feature
    after_feature_update = SafetyEvent()   # args: resource, feature

    before_feature_delete = SafetyEvent()  # args: resource, feature_id
    after_feature_delete = SafetyEvent()   # args: resource, feature_id

    before_all_feature_delete = SafetyEvent()  # args: resource
    after_all_feature_delete = SafetyEvent()

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    @property
    def _tablename(self):
        return 'layer_%s' % self.tbl_uuid

    def setup_from_ogr(self, ogrlayer, strdecode):
        tableinfo = TableInfo.from_ogrlayer(ogrlayer, self.srs.id, strdecode)
        tableinfo.setup_layer(self)

        tableinfo.setup_metadata(tablename=self._tablename)
        tableinfo.metadata.create_all(bind=DBSession.connection())

        self.tableinfo = tableinfo

    def setup_from_fields(self, fields):
        tableinfo = TableInfo.from_fields(
            fields, self.srs.id, self.geometry_type)
        tableinfo.setup_layer(self)

        tableinfo.setup_metadata(tablename=self._tablename)
        tableinfo.metadata.create_all(bind=DBSession.connection())

        self.tableinfo = tableinfo

    def load_from_ogr(self, ogrlayer, strdecode):
        self.tableinfo.load_from_ogr(ogrlayer, strdecode)

    def get_info(self):
        return super(VectorLayer, self).get_info() + (
            (_("Geometry type"), dict(zip(GEOM_TYPE.enum, GEOM_TYPE_DISPLAY))[
                self.geometry_type]),
            (_("Feature count"), self.feature_query()().total_count),
        )

    # IFeatureLayer

    @property
    def feature_query(self):

        class BoundFeatureQuery(FeatureQueryBase):
            layer = self

        return BoundFeatureQuery

    def field_by_keyname(self, keyname):
        for f in self.fields:
            if f.keyname == keyname:
                return f

        raise KeyError("Field '%s' not found!" % keyname)

    # IWritableFeatureLayer

    def feature_put(self, feature):
        self.before_feature_update.fire(resource=self, feature=feature)

        tableinfo = TableInfo.from_layer(self)
        tableinfo.setup_metadata(tablename=self._tablename)

        obj = tableinfo.model(id=feature.id)
        for f in tableinfo.fields:
            if f.keyname in feature.fields:
                setattr(obj, f.key, feature.fields[f.keyname])

        # FIXME: Don't try to write geometry if it exists.
        # This will not let to write empty geometry, but it is not needed yet.

        if feature.geom is not None:
            obj.geom = ga.elements.WKTElement(
                str(feature.geom), srid=self.srs_id)

        DBSession.merge(obj)

        self.after_feature_update.fire(resource=self, feature=feature)

        on_data_change.fire(self, feature.geom)
        # TODO: Old geom version

    def feature_create(self, feature):
        """Insert new object to DB which is described in feature

        :param feature: object description
        :type feature:  Feature

        :return:    inserted object ID
        """
        self.before_feature_create.fire(resource=self, feature=feature)

        tableinfo = TableInfo.from_layer(self)
        tableinfo.setup_metadata(tablename=self._tablename)

        obj = tableinfo.model()
        for f in tableinfo.fields:
            if f.keyname in feature.fields.keys():
                setattr(obj, f.key, feature.fields[f.keyname])

        obj.geom = ga.elements.WKTElement(
            str(feature.geom), srid=self.srs_id)

        DBSession.add(obj)
        DBSession.flush()
        DBSession.refresh(obj)

        self.after_feature_create.fire(resource=self, feature_id=obj.id)

        on_data_change.fire(self, feature.geom)

        return obj.id

    def feature_delete(self, feature_id):
        """Remove record with id

        :param feature_id: record id
        :type feature_id:  int or bigint
        """
        self.before_feature_delete.fire(resource=self, feature_id=feature_id)

        tableinfo = TableInfo.from_layer(self)
        tableinfo.setup_metadata(tablename=self._tablename)

        query = self.feature_query()
        query.geom()
        feature = query_feature_or_not_found(query, self.id, feature_id)
        obj = DBSession.query(tableinfo.model).filter_by(id=feature.id).one()
        DBSession.delete(obj)

        self.after_feature_delete.fire(resource=self, feature_id=feature_id)

        on_data_change.fire(self, feature.geom)

    def feature_delete_all(self):
        """Remove all records from a layer"""
        self.before_all_feature_delete.fire(resource=self)

        tableinfo = TableInfo.from_layer(self)
        tableinfo.setup_metadata(tablename=self._tablename)

        DBSession.query(tableinfo.model).delete()

        self.after_all_feature_delete.fire(resource=self)

        # TODO: Implement on_data_change

    # IBboxLayer implementation:
    @property
    def extent(self):
        """Return layer's extent
        """
        st_force2d = func.st_force2d
        st_transform = func.st_transform
        st_extent = func.st_extent
        st_setsrid = func.st_setsrid
        st_xmax = func.st_xmax
        st_xmin = func.st_xmin
        st_ymax = func.st_ymax
        st_ymin = func.st_ymin

        tableinfo = TableInfo.from_layer(self)
        tableinfo.setup_metadata(tablename=self._tablename)

        model = tableinfo.model

        fields = (
            st_extent(st_transform(st_setsrid(cast(
                st_force2d(model.geom), ga.Geometry), self.srs_id), 4326)),
        )
        bbox = DBSession.query(*fields).label('bbox')

        fields = (
            st_xmax(bbox),
            st_xmin(bbox),
            st_ymax(bbox),
            st_ymin(bbox),
        )
        maxLon, minLon, maxLat, minLat = DBSession.query(*fields).one()

        extent = dict(
            minLon=minLon,
            maxLon=maxLon,
            minLat=minLat,
            maxLat=maxLat
        )

        return extent


def _vector_layer_listeners(table):
    event.listen(
        table, "after_create",
        db.DDL("CREATE SCHEMA vector_layer")
    )

    event.listen(
        table, "after_drop",
        db.DDL("DROP SCHEMA IF EXISTS vector_layer CASCADE")
    )


_vector_layer_listeners(VectorLayer.__table__)


# DB initialization uses table.tometadata(), however
# SA doesn't copy event subscriptions in this case.

def tometadata(self, metadata):
    result = db.Table.tometadata(self, metadata)
    _vector_layer_listeners(result)
    return result


VectorLayer.__table__.tometadata = types.MethodType(
    tometadata, VectorLayer.__table__)


def _set_encoding(encoding):

    class encoding_section(object):

        def __init__(self, encoding):
            self.encoding = encoding

            if self.encoding:
                # For GDAL 1.9 and higher try to set SHAPE_ENCODING
                # through ctypes and libgdal

                # Load library only if we need
                # to recode
                self.lib = ctypes.CDLL('libgdal.so')

                # cpl_conv.h functions wrappers
                # see http://www.gdal.org/cpl__conv_8h.html

                # CPLGetConfigOption
                self.get_option = self.lib.CPLGetConfigOption
                self.get_option.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
                self.get_option.restype = ctypes.c_char_p

                # CPLStrdup
                self.strdup = self.lib.CPLStrdup
                self.strdup.argtypes = [ctypes.c_char_p, ]
                self.strdup.restype = ctypes.c_char_p

                # CPLSetThreadLocalConfigOption
                # Use thread local function
                # to minimize side effects.
                self.set_option = self.lib.CPLSetThreadLocalConfigOption
                self.set_option.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
                self.set_option.restype = None

        def __enter__(self):
            def strdecode(x):
                if len(x) >= 254:
                    # Cludge to fix 254 - 255 byte unicode string cut off
                    # Until we can decode
                    # cut a byte on the right

                    while True:
                        try:
                            x.decode(self.encoding)
                            break
                        except UnicodeDecodeError:
                            x = x[:-1]

                return x.decode(self.encoding)

            if self.encoding:
                # Set SHAPE_ENCODING value

                # Keep copy of the current value
                tmp = self.get_option('SHAPE_ENCODING'.encode(), None)
                self.old_value = self.strdup(tmp)

                # Set new value
                self.set_option('SHAPE_ENCODING'.encode(), ''.encode())

                return strdecode

            return lambda x: x

        def __exit__(self, type, value, traceback):
            if self.encoding:
                # Return old value
                self.set_option('SHAPE_ENCODING'.encode(), self.old_value)

    return encoding_section(encoding)


VE = ValidationError


class _source_attr(SP):

    def _ogrds(self, ogrds):
        if ogrds.GetLayerCount() < 1:
            raise VE(_("Dataset doesn't contain layers."))

        if ogrds.GetLayerCount() > 1:
            raise VE(_("Dataset contains more than one layer."))

        ogrlayer = ogrds.GetLayer(0)
        if ogrlayer is None:
            raise VE(_("Unable to open layer."))

        return ogrlayer

    def _ogrlayer(self, obj, ogrlayer, recode=lambda a: a):
        if ogrlayer.GetSpatialRef() is None:
            raise VE(_("Layer doesn't contain coordinate system information."))

        for feat in ogrlayer:
            geom = feat.GetGeometryRef()
            if geom is None:
                raise VE(_("Feature #%d doesn't have geometry.") % feat.GetFID())

        ogrlayer.ResetReading()

        obj.tbl_uuid = uuid.uuid4().hex

        with DBSession.no_autoflush:
            obj.setup_from_ogr(ogrlayer, recode)
            obj.load_from_ogr(ogrlayer, recode)

    def setter(self, srlzr, value):
        datafile, metafile = env.file_upload.get_filename(value['id'])
        encoding = value.get('encoding', 'utf-8')

        iszip = zipfile.is_zipfile(datafile)

        try:
            if iszip:
                ogrfn = tempfile.mkdtemp()
                zipfile.ZipFile(datafile, 'r').extractall(path=ogrfn)
            else:
                ogrfn = datafile

            if six.PY2:
                with _set_encoding(encoding) as sdecode:
                    ogrds = ogr.Open(ogrfn)
                    recode = sdecode
            else:
                # Ignore encoding option in Python 3
                ogrds = ogr.Open(ogrfn)
                recode = lambda x: x   # NOQA: E731

            if ogrds is None:
                raise VE(_("GDAL library failed to open file."))

            drivername = ogrds.GetDriver().GetName()

            if drivername not in ('ESRI Shapefile', 'GeoJSON', 'KML'):
                raise VE(_("Unsupport OGR driver: %s.") % drivername)

            ogrlayer = self._ogrds(ogrds)
            geomtype = ogrlayer.GetGeomType()
            if geomtype not in _GEOM_OGR_2_TYPE:
                raise VE(_("Unsupported geometry type: '%s'. Probable reason: data contain mixed geometries.") % (  # NOQA: E501
                    ogr.GeometryTypeToName(geomtype) if geomtype is not None else None))

            self._ogrlayer(srlzr.obj, ogrlayer, recode)

        finally:
            if iszip:
                shutil.rmtree(ogrfn)


class _fields_attr(SP):

    def setter(self, srlzr, value):
        srlzr.obj.tbl_uuid = uuid.uuid4().hex

        with DBSession.no_autoflush:
            srlzr.obj.setup_from_fields(value)


class _geometry_type_attr(SP):

    def setter(self, srlzr, value):
        if value not in GEOM_TYPE.enum:
            raise ValidationError(_("Unsupported geometry type."))

        if srlzr.obj.id is None:
            srlzr.obj.geometry_type = value

        elif srlzr.obj.geometry_type != value:
            raise ResourceError(_("Geometry type for existing resource can't be changed."))


P_DSS_READ = DataStructureScope.read
P_DSS_WRITE = DataStructureScope.write
P_DS_READ = DataScope.read
P_DS_WRITE = DataScope.write


class VectorLayerSerializer(Serializer):
    identity = VectorLayer.identity
    resclass = VectorLayer

    srs = SR(read=P_DSS_READ, write=P_DSS_WRITE)
    geometry_type = _geometry_type_attr(read=P_DSS_READ, write=P_DSS_WRITE)

    source = _source_attr(read=None, write=P_DS_WRITE)
    fields = _fields_attr(read=None, write=P_DS_WRITE)


@lru_cache()
def _clipbybox2d_exists():
    return (
        DBSession.connection()
        .execute("SELECT 1 FROM pg_proc WHERE proname='st_clipbybox2d'")
        .fetchone()
    )


@implementer(
    IFeatureQuery,
    IFeatureQueryFilter,
    IFeatureQueryFilterBy,
    IFeatureQueryLike,
    IFeatureQueryIntersects,
    IFeatureQueryOrderBy,
    IFeatureQueryClipByBox,
    IFeatureQuerySimplify,
)
class FeatureQueryBase(object):

    def __init__(self):
        self._srs = None
        self._geom = None
        self._clip_by_box = None
        self._simplify = None
        self._single_part_geom = None
        self._box = None

        self._geom_len = None

        self._fields = None
        self._limit = None
        self._offset = None

        self._filter = None
        self._filter_by = None
        self._filter_sql = None
        self._like = None
        self._intersects = None

        self._order_by = None

    def srs(self, srs):
        self._srs = srs

    def geom(self, single_part=False):
        self._geom = True
        self._single_part = single_part

    def clip_by_box(self, box):
        self._clip_by_box = box

    def simplify(self, tolerance):
        self._simplify = tolerance

    def geom_length(self):
        self._geom_len = True

    def box(self):
        self._box = True

    def fields(self, *args):
        self._fields = args

    def limit(self, limit, offset=0):
        self._limit = limit
        self._offset = offset

    def filter(self, *args):
        self._filter = args

    def filter_by(self, **kwargs):
        self._filter_by = kwargs

    def filter_sql(self, *args):
        if len(args) > 0 and isinstance(args[0], list):
            self._filter_sql = args[0]
        else:
            self._filter_sql = args

    def order_by(self, *args):
        self._order_by = args

    def like(self, value):
        self._like = value

    def intersects(self, geom):
        self._intersects = geom

    def __call__(self):
        tableinfo = TableInfo.from_layer(self.layer)
        tableinfo.setup_metadata(tablename=self.layer._tablename)
        table = tableinfo.table

        columns = [table.columns.id, ]
        where = []

        srsid = self.layer.srs_id if self._srs is None else self._srs.id

        geomcol = table.columns.geom
        geomexpr = db.func.st_transform(geomcol, srsid)

        if self._clip_by_box is not None:
            if _clipbybox2d_exists():
                clip = db.func.st_setsrid(
                    db.func.st_makeenvelope(*self._clip_by_box.bounds),
                    self._clip_by_box.srid)
                geomexpr = db.func.st_clipbybox2d(geomexpr, clip)
            else:
                clip = db.func.st_setsrid(
                    db.func.st_geomfromtext(self._clip_by_box.wkt),
                    self._clip_by_box.srid)
                geomexpr = db.func.st_intersection(geomexpr, clip)

        if self._simplify is not None:
            geomexpr = db.func.st_simplifypreservetopology(
                geomexpr, self._simplify
            )

        if self._geom:
            if self._single_part:

                class geom(ColumnElement):
                    def __init__(self, base):
                        self.base = base

                @compiles(geom)
                def compile(expr, compiler, **kw):
                    return "(%s).geom" % str(compiler.process(expr.base))

                columns.append(db.func.st_asewkb(geom(db.func.st_dump(geomexpr))).label('geom'))
            else:
                columns.append(db.func.st_asewkb(geomexpr).label('geom'))

        if self._geom_len:
            columns.append(db.func.st_length(db.func.geography(
                db.func.st_transform(geomexpr, 4326))).label('geom_len'))

        if self._box:
            columns.extend((
                db.func.st_xmin(geomexpr).label('box_left'),
                db.func.st_ymin(geomexpr).label('box_bottom'),
                db.func.st_xmax(geomexpr).label('box_right'),
                db.func.st_ymax(geomexpr).label('box_top'),
            ))

        selected_fields = []
        for f in tableinfo.fields:
            if not self._fields or f.keyname in self._fields:
                columns.append(table.columns[f.key].label(f.keyname))
                selected_fields.append(f)

        if self._filter_by:
            for k, v in six.iteritems(self._filter_by):
                if k == 'id':
                    where.append(table.columns.id == v)
                else:
                    where.append(table.columns[tableinfo[k].key] == v)

        if self._filter:
            token = []
            for k, o, v in self._filter:
                supported_operators = (
                    "eq",
                    "ge",
                    "gt",
                    "ilike",
                    "in",
                    "le",
                    "like",
                    "lt",
                    "ne",
                    "notin",
                    "startswith",
                )
                if o not in supported_operators:
                    raise ValueError(
                        "Invalid operator '%s'. Only %r are supported."
                        % (o, supported_operators)
                    )

                if o in [
                    "ilike",
                    "in",
                    "like",
                    "notin",
                    "startswith",
                ]:
                    o += "_op"

                op = getattr(db.sql.operators, o)
                if k == "id":
                    token.append(op(table.columns.id, v))
                else:
                    token.append(op(table.columns[tableinfo[k].key], v))

            where.append(db.and_(*token))

        if self._filter_sql:
            token = []
            for _filter_sql_item in self._filter_sql:
                if len(_filter_sql_item) == 3:
                    table_column, op, val = _filter_sql_item
                    if table_column == 'id':
                        token.append(op(table.columns.id, val))
                    else:
                        token.append(op(table.columns[tableinfo[table_column].key], val))
                elif len(_filter_sql_item) == 4:
                    table_column, op, val1, val2 = _filter_sql_item
                    token.append(op(table.columns[tableinfo[table_column].key], val1, val2))

            where.append(db.and_(*token))

        if self._like:
            token = []
            for f in tableinfo.fields:
                token.append(
                    cast(table.columns[f.key], db.Unicode).ilike(
                        "%" + self._like + "%"
                    )
                )

            where.append(db.or_(*token))

        if self._intersects:
            intgeom = db.func.st_setsrid(db.func.st_geomfromtext(
                self._intersects.wkt), self._intersects.srid)
            where.append(db.func.st_intersects(
                geomcol, db.func.st_transform(
                    intgeom, self.layer.srs_id)))

        order_criterion = []
        if self._order_by:
            for order, colname in self._order_by:
                order_criterion.append(dict(asc=db.asc, desc=db.desc)[order](
                    table.columns[tableinfo[colname].key]))
        order_criterion.append(table.columns.id)

        class QueryFeatureSet(FeatureSet):
            fields = selected_fields
            layer = self.layer

            _geom = self._geom
            _geom_len = self._geom_len
            _box = self._box
            _limit = self._limit
            _offset = self._offset

            def __iter__(self):
                query = sql.select(
                    columns,
                    whereclause=db.and_(*where),
                    limit=self._limit,
                    offset=self._offset,
                    order_by=order_criterion,
                )
                rows = DBSession.connection().execute(query)
                for row in rows:
                    fdict = dict((f.keyname, row[f.keyname])
                                 for f in selected_fields)
                    if self._geom:
                        geom = geom_from_wkb(
                            row['geom'].tobytes() if six.PY3
                            else six.binary_type(row['geom']))
                    else:
                        geom = None

                    calculated = dict()
                    if self._geom_len:
                        calculated['geom_len'] = row['geom_len']

                    yield Feature(
                        layer=self.layer, id=row.id,
                        fields=fdict, geom=geom,
                        calculations=calculated,
                        box=box(
                            row.box_left, row.box_bottom,
                            row.box_right, row.box_top
                        ) if self._box else None
                    )

            @property
            def total_count(self):
                query = sql.select(
                    [db.func.count(table.columns.id), ],
                    whereclause=db.and_(*where)
                )
                res = DBSession.connection().execute(query)
                for row in res:
                    return row[0]

        return QueryFeatureSet()
