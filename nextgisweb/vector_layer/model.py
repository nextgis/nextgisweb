# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import json
import uuid
import zipfile
import ctypes
from datetime import datetime, time, date
import six

from zope.interface import implementer
from osgeo import gdal, ogr, osr
from shapely.geometry import box
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
from ..core.exception import ValidationError
from ..resource import (
    Resource,
    DataScope,
    DataStructureScope,
    IResourceEstimateStorage,
    Serializer,
    SerializedProperty as SP,
    SerializedRelationship as SR,
    ResourceGroup)
from ..resource.exception import ResourceError
from ..env import env
from ..models import declarative_base, DBSession, migrate_operation
from ..layer import SpatialLayerMixin, IBboxLayer
from ..lib.geometry import Geometry
from ..compat import lru_cache, html_escape

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
    IFieldEditableFeatureLayer,
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

from .kind_of_data import VectorLayerData
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

SCHEMA = 'vector_layer'

Base = declarative_base(dependencies=('resource', 'feature_layer'))


def translate(trstring):
    return env.core.localizer().translate(trstring)


class DRIVERS:
    ESRI_SHAPEFILE = 'ESRI Shapefile'
    GEOJSON = 'GeoJSON'
    KML = 'KML'
    LIBKML = 'LIBKML'
    GML = 'GML'

    enum = (ESRI_SHAPEFILE, GEOJSON, KML, LIBKML, GML)


OPEN_OPTIONS = ('EXPOSE_FID=NO', )


class ERROR_FIX(object):
    NONE = 'NONE'
    SAFE = 'SAFE'
    LOSSY = 'LOSSY'

    default = NONE
    enum = (NONE, SAFE, LOSSY)


skip_errors_default = False

error_limit = 10


class TOGGLE(object):
    AUTO = None
    YES = True
    NO = False

    enum = (AUTO, YES, NO)


geom_cast_params_default = dict(
    geometry_type=TOGGLE.AUTO,
    is_multi=TOGGLE.AUTO,
    has_z=TOGGLE.AUTO)


class FID_SOURCE(object):
    AUTO = 'AUTO'
    SEQUENCE = 'SEQUENCE'
    FIELD = 'FIELD'


fid_params_default = dict(
    fid_source=FID_SOURCE.SEQUENCE,
    fid_field=None)


class FieldDef(object):

    def __init__(
        self, key, keyname, datatype, uuid, display_name=None,
        label_field=None, grid_visibility=None
    ):
        self.key = key
        self.keyname = keyname
        self.datatype = datatype
        self.uuid = uuid
        self.display_name = display_name
        self.label_field = label_field
        self.grid_visibility = grid_visibility


class TableInfo(object):

    def __init__(self, srs_id):
        self.srs_id = srs_id
        self.metadata = None
        self.table = None
        self.model = None
        self.fid_field_index = None
        self.fmap = None
        self.geometry_type = None

    @classmethod
    def from_ogrlayer(cls, ogrlayer, srs_id, strdecode, skip_other_geometry_types,
                      fid_params, geom_cast_params):
        self = cls(srs_id)

        if geom_cast_params['geometry_type'] == GEOM_TYPE.POINT:
            geom_filter = set(GEOM_TYPE.points)
        elif geom_cast_params['geometry_type'] == GEOM_TYPE.LINESTRING:
            geom_filter = set(GEOM_TYPE.linestrings)
        elif geom_cast_params['geometry_type'] == GEOM_TYPE.POLYGON:
            geom_filter = set(GEOM_TYPE.polygons)
        else:
            geom_filter = set(GEOM_TYPE.enum)

        if geom_cast_params['is_multi'] == TOGGLE.NO:
            geom_filter -= set(GEOM_TYPE.is_multi)
        elif geom_cast_params['is_multi'] == TOGGLE.YES:
            geom_filter = geom_filter.intersection(set(GEOM_TYPE.is_multi))

        if geom_cast_params['has_z'] == TOGGLE.NO:
            geom_filter -= set(GEOM_TYPE.has_z)
        elif geom_cast_params['has_z'] == TOGGLE.YES:
            geom_filter = geom_filter.intersection(set(GEOM_TYPE.has_z))

        ltype = ogrlayer.GetGeomType()

        if len(geom_filter) == 1:
            self.geometry_type = geom_filter.pop()
        elif ltype in GEOM_TYPE_OGR and _GEOM_OGR_2_TYPE[ltype] in geom_filter:
            self.geometry_type = _GEOM_OGR_2_TYPE[ltype]
        elif len(geom_filter) > 1:
            is_multi = False
            has_z = False

            for feature in ogrlayer:
                if len(geom_filter) <= 1:
                    break

                geom = feature.GetGeometryRef()
                if geom is None:
                    continue
                gtype = geom.GetGeometryType()
                if gtype in (ogr.wkbGeometryCollection, ogr.wkbGeometryCollection25D) \
                    and geom.GetGeometryCount() == 1:
                    geom = geom.GetGeometryRef(0)
                    gtype = geom.GetGeometryType()

                if gtype not in GEOM_TYPE_OGR:
                    continue
                geometry_type = _GEOM_OGR_2_TYPE[gtype]

                if geom_cast_params['geometry_type'] == TOGGLE.AUTO:
                    if geometry_type in GEOM_TYPE.points:
                        geom_filter = geom_filter.intersection(set(GEOM_TYPE.points))
                    elif geometry_type in GEOM_TYPE.linestrings:
                        geom_filter = geom_filter.intersection(set(GEOM_TYPE.linestrings))
                    elif geometry_type in GEOM_TYPE.polygons:
                        geom_filter = geom_filter.intersection(set(GEOM_TYPE.polygons))
                elif skip_other_geometry_types and geometry_type not in geom_filter:
                    continue

                if geom_cast_params['is_multi'] == TOGGLE.AUTO and not is_multi \
                    and geometry_type in GEOM_TYPE.is_multi:
                    geom_filter = geom_filter.intersection(set(GEOM_TYPE.is_multi))
                    is_multi = True

                if geom_cast_params['has_z'] == TOGGLE.AUTO and not has_z \
                    and geometry_type in GEOM_TYPE.has_z:
                    geom_filter = geom_filter.intersection(set(GEOM_TYPE.has_z))
                    has_z = True

            if geom_cast_params['is_multi'] == TOGGLE.AUTO and not is_multi:
                geom_filter = geom_filter - set(GEOM_TYPE.is_multi)

            if geom_cast_params['has_z'] == TOGGLE.AUTO and not has_z:
                geom_filter = geom_filter - set(GEOM_TYPE.has_z)

            ogrlayer.ResetReading()

            if len(geom_filter) == 1:
                self.geometry_type = geom_filter.pop()

        if self.geometry_type is None:
            err_msg = _("Could not determine a geometry type.")
            if len(geom_filter) == 0:
                err_msg += " " + _("Source layer contains no features satisfying the conditions.")
            raise VE(message=err_msg)

        self.fields = []

        defn = ogrlayer.GetLayerDefn()

        if fid_params['fid_source'] in (FID_SOURCE.AUTO, FID_SOURCE.FIELD):
            if fid_params['fid_field'] is not None:
                idx = defn.GetFieldIndex(fid_params['fid_field'])
                if idx != -1:
                    fld_defn = defn.GetFieldDefn(idx)
                    if fld_defn.GetType() == ogr.OFTInteger:
                        self.fid_field_index = idx

            if self.fid_field_index is None and fid_params['fid_source'] == FID_SOURCE.FIELD:
                if fid_params['fid_field'] is None:
                    raise VE(_("Parameter 'fid_field' is missing."))
                else:
                    if idx == -1:
                        raise VE(_("Field '%s' not found.") % fid_params['fid_field'])
                    else:
                        raise VE(_("Field '%s' type is not integer.") % fid_params['fid_field'])

        for i in range(defn.GetFieldCount()):
            if i == self.fid_field_index:
                continue
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
                fld.get('display_name'),
                fld.get('label_field'),
                fld.get('grid_visibility')
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
        _keynames = []
        _display_names = []
        for f in self.fields:
            if f.display_name is None:
                f.display_name = f.keyname

            # Check unique names
            if f.keyname in _keynames:
                raise ValidationError("Field keyname (%s) is not unique." % f.keyname)
            if f.display_name in _display_names:
                raise ValidationError("Field display_name (%s) is not unique." % f.display_name)
            _keynames.append(f.keyname)
            _display_names.append(f.display_name)

            field = VectorLayerField(
                keyname=f.keyname,
                datatype=f.datatype,
                display_name=f.display_name,
                fld_uuid=f.uuid
            )
            if f.grid_visibility is not None:
                field.grid_visibility = f.grid_visibility

            layer.fields.append(field)

            if f.label_field:
                layer.feature_label_field = field

    def setup_metadata(self, tablename):
        metadata = db.MetaData(schema=SCHEMA)
        metadata.bind = env.core.engine
        geom_fldtype = _GEOM_TYPE_2_DB[self.geometry_type]

        class model(object):
            def __init__(self, **kwargs):
                for k, v in six.iteritems(kwargs):
                    setattr(self, k, v)

        sequence = db.Sequence(tablename + '_id_seq', start=1,
                               minvalue=-2**31, metadata=metadata)
        table = db.Table(
            tablename,
            metadata, db.Column(
                'id', db.Integer,
                sequence,
                primary_key=True),
            db.Column('geom', ga.Geometry(
                dimension=2, srid=self.srs_id,
                geometry_type=geom_fldtype)),
            *map(lambda fld: db.Column(fld.key, _FIELD_TYPE_2_DB[
                fld.datatype]), self.fields)
        )

        db.mapper(model, table)

        self.metadata = metadata
        self.sequence = sequence
        self.table = table
        self.model = model
        self.fmap = {fld.keyname: fld.key for fld in self.fields}

    def load_from_ogr(self, ogrlayer, strdecode, skip_other_geometry_types,
                      fix_errors, skip_errors):
        source_osr = ogrlayer.GetSpatialRef()
        target_osr = osr.SpatialReference()
        target_osr.ImportFromEPSG(self.srs_id)

        transform = osr.CoordinateTransformation(source_osr, target_osr)

        errors = []

        max_fid = None
        for i, feature in enumerate(ogrlayer, start=1):
            if len(errors) >= error_limit:
                break

            if self.fid_field_index is None:
                fid = i
            else:
                fid = feature.GetFieldAsInteger(self.fid_field_index)
            max_fid = max(max_fid, fid) if max_fid is not None else fid

            geom = feature.GetGeometryRef()
            if geom is None:
                if not skip_other_geometry_types:
                    errors.append(_("Feature #%d doesn't have geometry.") % fid)
                continue

            # Extract GeometryCollection
            if geom.GetGeometryType() in (ogr.wkbGeometryCollection, ogr.wkbGeometryCollection25D) \
               and fix_errors != ERROR_FIX.NONE:
                geom_candidate = None
                for i in range(geom.GetGeometryCount()):
                    col_geom = geom.GetGeometryRef(i)
                    col_gtype = col_geom.GetGeometryType()
                    if col_gtype not in GEOM_TYPE_OGR:
                        continue
                    if (self.geometry_type in GEOM_TYPE.points and col_gtype in (
                           ogr.wkbPoint, ogr.wkbPoint25D,
                           ogr.wkbMultiPoint, ogr.wkbMultiPoint25D)) \
                       or (self.geometry_type in GEOM_TYPE.linestrings and col_gtype in (
                           ogr.wkbLineString, ogr.wkbLineString25D,
                           ogr.wkbMultiLineString, ogr.wkbMultiLineString25D)) \
                       or (self.geometry_type in GEOM_TYPE.polygons and col_gtype in (
                           ogr.wkbPolygon, ogr.wkbPolygon25D,
                           ogr.wkbMultiPolygon, ogr.wkbMultiPolygon25D)):
                        if geom_candidate is None:
                            geom_candidate = col_geom
                            if fix_errors == ERROR_FIX.LOSSY:
                                break
                        else:
                            errors.append(_("Feature #%d has multiple geometries satisfying the conditions.") % fid)
                            continue
                if geom_candidate is not None:
                    geom = geom_candidate

            gtype = geom.GetGeometryType()

            # Check geometry type
            if gtype not in GEOM_TYPE_OGR:
                if not skip_other_geometry_types:
                    errors.append(_(
                        "Feature #%d has unknown geometry type: %d (%s).") % (
                        fid, gtype, ogr.GeometryTypeToName(gtype)))
                continue
            elif not any((
                (self.geometry_type in GEOM_TYPE.points
                    and _GEOM_OGR_2_TYPE[gtype] in GEOM_TYPE.points),
                (self.geometry_type in GEOM_TYPE.linestrings
                    and _GEOM_OGR_2_TYPE[gtype] in GEOM_TYPE.linestrings),
                (self.geometry_type in GEOM_TYPE.polygons
                    and _GEOM_OGR_2_TYPE[gtype] in GEOM_TYPE.polygons),
            )):
                if not skip_other_geometry_types:
                    errors.append(_(
                        "Feature #%d has unsuitable geometry type: %d (%s).") % (
                        fid, gtype, ogr.GeometryTypeToName(gtype)))
                continue

            # Force single geometries to multi
            if self.geometry_type in GEOM_TYPE.is_multi:
                if gtype in (ogr.wkbPoint, ogr.wkbPoint25D):
                    geom = ogr.ForceToMultiPoint(geom)
                elif gtype in (ogr.wkbLineString, ogr.wkbLineString25D):
                    geom = ogr.ForceToMultiLineString(geom)
                elif gtype in (ogr.wkbPolygon, ogr.wkbPolygon25D):
                    geom = ogr.ForceToMultiPolygon(geom)
            elif gtype in (ogr.wkbMultiPoint, ogr.wkbMultiPoint25D,
                           ogr.wkbMultiLineString, ogr.wkbMultiLineString25D,
                           ogr.wkbMultiPolygon, ogr.wkbMultiPolygon25D):
                if geom.GetGeometryCount() == 1 or fix_errors == ERROR_FIX.LOSSY:
                    geom = geom.GetGeometryRef(0)
                else:
                    errors.append(_("Feature #%d has multiple geometries satisfying the conditions.") % fid)
                    continue

            geom.Transform(transform)

            # Force Z
            has_z = self.geometry_type in GEOM_TYPE.has_z
            if has_z and not geom.Is3D():
                geom.Set3D(True)
            elif not has_z and geom.Is3D():
                geom.Set3D(False)
          
            # Points can't have validity errors.
            is_single = _GEOM_OGR_2_TYPE[gtype] not in GEOM_TYPE.is_multi
            is_point = _GEOM_OGR_2_TYPE[gtype] in GEOM_TYPE.points
            is_polygon = _GEOM_OGR_2_TYPE[gtype] in GEOM_TYPE.polygons

            if not is_point and not geom.IsValid():
                # Close rings for polygons: GDAL doesn't provide a method for
                # checking if a geometry has unclosed rings, but we can achieve
                # this via comparison.
                if is_polygon:
                    geom_closed = geom.Clone()
                    geom_closed.CloseRings()
                    if not geom_closed.Equals(geom):
                        if fix_errors == ERROR_FIX.NONE:
                            errors.append(_("Feature #%d has unclosed rings.") % fid)
                            continue
                        else:
                            geom = geom_closed

                # Check for polygon rings with fewer than 3 points and
                # linestrings with fewer than 2 points.
                if not geom.IsValid():
                    error_found = False
                    for part in ((geom, ) if is_single else geom):
                        if is_polygon:
                            for ring in part:
                                if ring.GetPointCount() < 4:
                                    # TODO: Invalid parts can be removed from multipart geometries in LOSSY mode.
                                    errors.append(_("Feature #%d has less than 3 points in a polygon ring.") % fid)
                                    error_found = True
                        elif part.GetPointCount() < 2:
                            # TODO: Invalid parts can be removed from multipart geometries in LOSSY mode.
                            errors.append(_("Feature #%d has less than 2 points in a linestring.") % fid)
                            error_found = True
                        if error_found:
                            break
                    if error_found:
                        continue
                
                # NOTE: Disabled for better times.
                # Check for topology errors and fix them as possible.
                # invalid = True
                # if fix_errors != ERROR_FIX.NONE:
                #     if fix_errors == ERROR_FIX.LOSSY and not geom.IsValid():
                #         geom = geom.MakeValid()
                #         if geom is not None and not geom.IsValid():
                #             geom = geom.Buffer(0)
                #     invalid = geom is None or not geom.IsValid() or geom.GetGeometryType() != gtype
                # if invalid:
                #     errors.append(_("Feature #%d has invalid geometry.") % fid)
                #     continue

            fld_values = dict()
            for i in range(feature.GetFieldCount()):
                if i == self.fid_field_index:
                    continue
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
                        errors.append(_(
                            "It seems like declared and actual attributes "
                            "encodings do not match. Unable to decode "
                            "attribute #%(attr)d of feature #%(feat)d. "
                            "Try declaring different encoding.") % dict(
                            feat=fid, attr=i))
                        continue

                fld_name = strdecode(feature.GetFieldDefnRef(i).GetNameRef())
                fld_values[self[fld_name].key] = fld_value

            if len(errors) > 0 and not skip_errors:
                continue

            obj = self.model(id=fid, geom=ga.elements.WKBElement(
                bytearray(geom.ExportToWkb(ogr.wkbNDR)), srid=self.srs_id), **fld_values)

            DBSession.add(obj)

        if len(errors) > 0 and not skip_errors:
            detail = '<br>'.join(html_escape(translate(error)) for error in errors)
            raise VE(message=_("Vector layer cannot be written due to errors."), detail=detail)

        # Set sequence next value
        if max_fid is not None:
            connection = DBSession.connection()
            connection.execute('ALTER SEQUENCE "%s"."%s" RESTART WITH %d' %
                               (self.sequence.schema, self.sequence.name, max_fid + 1))


class VectorLayerField(Base, LayerField):
    identity = 'vector_layer'

    __tablename__ = LayerField.__tablename__ + '_' + identity
    __mapper_args__ = dict(polymorphic_identity=identity)

    id = db.Column(db.ForeignKey(LayerField.id), primary_key=True)
    fld_uuid = db.Column(db.Unicode(32), nullable=False)


@implementer(
    IFeatureLayer, IFieldEditableFeatureLayer, IWritableFeatureLayer,
    IBboxLayer, IResourceEstimateStorage)
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

    def setup_from_ogr(self, ogrlayer, strdecode=lambda x: x,
                       skip_other_geometry_types=False,
                       fid_params=fid_params_default,
                       geom_cast_params=geom_cast_params_default):
        tableinfo = TableInfo.from_ogrlayer(
            ogrlayer, self.srs.id, strdecode, skip_other_geometry_types,
            fid_params, geom_cast_params)
        tableinfo.setup_layer(self)

        tableinfo.setup_metadata(self._tablename)
        tableinfo.metadata.create_all(bind=DBSession.connection())

        self.tableinfo = tableinfo

    def setup_from_fields(self, fields):
        tableinfo = TableInfo.from_fields(
            fields, self.srs.id, self.geometry_type)
        tableinfo.setup_layer(self)

        tableinfo.setup_metadata(self._tablename)
        tableinfo.metadata.create_all(bind=DBSession.connection())

        self.tableinfo = tableinfo

    def load_from_ogr(self, ogrlayer, strdecode=lambda x: x,
                      skip_other_geometry_types=False,
                      fix_errors=ERROR_FIX.default, skip_errors=skip_errors_default):
        self.tableinfo.load_from_ogr(
            ogrlayer, strdecode, skip_other_geometry_types, fix_errors, skip_errors)

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

    # IFieldEditableFeatureLayer

    def field_create(self, datatype):
        uid = str(uuid.uuid4().hex)
        column = db.Column('fld_' + uid, _FIELD_TYPE_2_DB[datatype])
        op = migrate_operation()
        op.add_column(self._tablename, column, schema=SCHEMA)

        return VectorLayerField(datatype=datatype, fld_uuid=uid)

    def field_delete(self, field):
        uid = field.fld_uuid
        DBSession.delete(field)

        op = migrate_operation()
        with op.batch_alter_table(self._tablename, schema=SCHEMA) as batch_op:
            batch_op.drop_column('fld_' + uid)

    # IWritableFeatureLayer

    def feature_put(self, feature):
        self.before_feature_update.fire(resource=self, feature=feature)

        tableinfo = TableInfo.from_layer(self)
        tableinfo.setup_metadata(self._tablename)

        obj = tableinfo.model(id=feature.id)
        for f in tableinfo.fields:
            if f.keyname in feature.fields:
                setattr(obj, f.key, feature.fields[f.keyname])

        # FIXME: Don't try to write geometry if it exists.
        # This will not let to write empty geometry, but it is not needed yet.

        if feature.geom is not None:
            obj.geom = ga.elements.WKBElement(
                bytearray(feature.geom.wkb), srid=self.srs_id)

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
        tableinfo.setup_metadata(self._tablename)

        obj = tableinfo.model()
        for f in tableinfo.fields:
            if f.keyname in feature.fields.keys():
                setattr(obj, f.key, feature.fields[f.keyname])

        obj.geom = ga.elements.WKBElement(
            bytearray(feature.geom.wkb), srid=self.srs_id)

        shape = feature.geom.shape
        geom_type = shape.geom_type.upper()
        if shape.has_z:
            geom_type += 'Z'
        if geom_type != self.geometry_type:
            raise ValidationError(
                _("Geometry type (%s) does not match geometry column type (%s).")
                % (geom_type, self.geometry_type)
            )

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
        tableinfo.setup_metadata(self._tablename)

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
        tableinfo.setup_metadata(self._tablename)

        DBSession.query(tableinfo.model).delete()

        self.after_all_feature_delete.fire(resource=self)

        geom = box(self.srs.minx, self.srs.miny, self.srs.maxx, self.srs.maxy)
        on_data_change.fire(self, geom)

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
        tableinfo.setup_metadata(self._tablename)

        model = tableinfo.model

        bbox = st_extent(st_transform(st_setsrid(cast(
            st_force2d(model.geom), ga.Geometry), self.srs_id), 4326)
        ).label('bbox')
        sq = DBSession.query(bbox).subquery()

        fields = (
            st_xmax(sq.c.bbox),
            st_xmin(sq.c.bbox),
            st_ymax(sq.c.bbox),
            st_ymin(sq.c.bbox),
        )
        maxLon, minLon, maxLat, minLat = DBSession.query(*fields).one()

        extent = dict(
            minLon=minLon,
            maxLon=maxLon,
            minLat=minLat,
            maxLat=maxLat
        )

        return extent

    # IResourceEstimateStorage implementation:
    def estimate_storage(self):
        result = dict()

        # Size of vector layer table without indexes
        size = DBSession.query(func.pg_relation_size(
            '"{}"."{}"'.format(SCHEMA, self._tablename)
        )).scalar()
        result[VectorLayerData.identity] = size

        return result


# Create vector_layer schema on table creation
event.listen(
    VectorLayer.__table__, "after_create",
    db.DDL("CREATE SCHEMA %s" % SCHEMA),
    propagate=True)

# Drop vector_layer schema on table creation
event.listen(
    VectorLayer.__table__, "after_drop",
    db.DDL("DROP SCHEMA IF EXISTS %s CASCADE" % SCHEMA),
    propagate=True)


# Drop data table on vector layer deletion
@event.listens_for(VectorLayer, 'before_delete')
def drop_verctor_layer_table(mapper, connection, target):
    tableinfo = TableInfo.from_layer(target)
    tableinfo.setup_metadata(target._tablename)
    tableinfo.metadata.drop_all(bind=connection)


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

    def _ogrds(self, filename, encoding):
        if six.PY2:
            with _set_encoding(encoding) as sdecode:
                ogrds = gdal.OpenEx(filename, 0, allowed_drivers=DRIVERS.enum, open_options=OPEN_OPTIONS)
                strdecode = sdecode
        else:
            # Ignore encoding option in Python 3
            ogrds = gdal.OpenEx(filename, 0, allowed_drivers=DRIVERS.enum, open_options=OPEN_OPTIONS)

            def strdecode(x):
                return x

        if ogrds is None:
            ogrds = ogr.Open(filename, 0)
            if ogrds is None:
                raise VE(_("GDAL library failed to open file."))
            else:
                drivername = ogrds.GetDriver().GetName()
                raise VE(_("Unsupport OGR driver: %s.") % drivername)

        return ogrds, strdecode

    def _ogrlayer(self, ogrds):
        if ogrds.GetLayerCount() < 1:
            raise VE(_("Dataset doesn't contain layers."))

        if ogrds.GetLayerCount() > 1:
            raise VE(_("Dataset contains more than one layer."))

        ogrlayer = ogrds.GetLayer(0)
        if ogrlayer is None:
            raise VE(_("Unable to open layer."))

        # Do not trust geometry type of shapefiles
        if ogrds.GetDriver().ShortName == DRIVERS.ESRI_SHAPEFILE:
            ogrlayer.GetGeomType = lambda: ogr.wkbUnknown

        return ogrlayer

    def _setup_layer(self, obj, ogrlayer, skip_other_geometry_types, fix_errors, skip_errors,
                     geom_cast_params, fid_params, strdecode):
        if ogrlayer.GetSpatialRef() is None:
            raise VE(_("Layer doesn't contain coordinate system information."))

        obj.tbl_uuid = uuid.uuid4().hex

        with DBSession.no_autoflush:
            obj.setup_from_ogr(ogrlayer, strdecode, skip_other_geometry_types, fid_params, geom_cast_params)
            obj.load_from_ogr(ogrlayer, strdecode, skip_other_geometry_types, fix_errors, skip_errors)

    def setter(self, srlzr, value):
        if srlzr.obj.id is not None:
            raise ValidationError("Source parameter does not apply to update vector layer.")

        datafile, metafile = env.file_upload.get_filename(value['id'])

        encoding = srlzr.data.get('encoding')
        if encoding is None:
            # backward compatibility
            encoding = value.get('encoding', 'utf-8')

        iszip = zipfile.is_zipfile(datafile)
        ogrfn = ('/vsizip/{%s}' % datafile) if iszip else datafile

        ogrds, strdecode = self._ogrds(ogrfn, encoding)
        ogrlayer = self._ogrlayer(ogrds)

        skip_other_geometry_types = srlzr.data.get('skip_other_geometry_types')

        fix_errors = srlzr.data.get('fix_errors', ERROR_FIX.default)
        if fix_errors not in ERROR_FIX.enum:
            raise VE(_("Unknown 'fix_errors' value."))

        skip_errors = srlzr.data.get('skip_errors', skip_errors_default)

        geometry_type = srlzr.data.get(
            'cast_geometry_type', geom_cast_params_default['geometry_type'])
        if geometry_type not in (None, 'POINT', 'LINESTRING', 'POLYGON'):
            raise VE(_("Unknown 'cast_geometry_type' value."))

        is_multi = srlzr.data.get('cast_is_multi', geom_cast_params_default['is_multi'])
        if is_multi not in TOGGLE.enum:
            raise VE(_("Unknown 'cast_is_multi' value."))

        has_z = srlzr.data.get('cast_has_z', geom_cast_params_default['has_z'])
        if has_z not in TOGGLE.enum:
            raise VE(_("Unknown 'cast_has_z' value."))

        geom_cast_params = dict(
            geometry_type=geometry_type,
            is_multi=is_multi,
            has_z=has_z)

        fid_source = srlzr.data.get('fid_source', fid_params_default['fid_source'])
        fid_params = dict(
            fid_source=fid_source,
            fid_field=srlzr.data.get('fid_field')
        )

        self._setup_layer(srlzr.obj, ogrlayer, skip_other_geometry_types, fix_errors, skip_errors,
                          geom_cast_params, fid_params, strdecode)


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

    source = _source_attr(read=None, write=P_DS_WRITE)

    geometry_type = _geometry_type_attr(read=P_DSS_READ, write=P_DSS_WRITE)
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
        self._single_part = None
        self._geom_format = 'WKB'
        self._clip_by_box = None
        self._simplify = None
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

    def geom_format(self, geom_format):
        self._geom_format = geom_format

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
        tableinfo.setup_metadata(self.layer._tablename)
        table = tableinfo.table

        columns = [table.columns.id, ]
        where = []

        srsid = self.layer.srs_id if self._srs is None else self._srs.id

        geomcol = table.columns.geom
        geomexpr = func.st_transform(geomcol, srsid)

        if self._clip_by_box is not None:
            if _clipbybox2d_exists():
                clip = func.st_setsrid(
                    func.st_makeenvelope(*self._clip_by_box.bounds),
                    self._clip_by_box.srid)
                geomexpr = func.st_clipbybox2d(geomexpr, clip)
            else:
                clip = func.st_setsrid(
                    func.st_geomfromtext(self._clip_by_box.wkt),
                    self._clip_by_box.srid)
                geomexpr = func.st_intersection(geomexpr, clip)

        if self._simplify is not None:
            geomexpr = func.st_simplifypreservetopology(
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

                geomexpr = geom(func.st_dump(geomexpr))

            if self._geom_format == 'WKB':
                geomexpr = func.st_asbinary(geomexpr, 'NDR')
            else:
                geomexpr = func.st_astext(geomexpr)

            columns.append(geomexpr.label('geom'))

        if self._geom_len:
            columns.append(func.st_length(func.geography(
                func.st_transform(geomexpr, 4326))).label('geom_len'))

        if self._box:
            columns.extend((
                func.st_xmin(geomexpr).label('box_left'),
                func.st_ymin(geomexpr).label('box_bottom'),
                func.st_xmax(geomexpr).label('box_right'),
                func.st_ymax(geomexpr).label('box_top'),
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

                if v and o in ['in', 'notin']:
                    v = v.split(',')

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
            intgeom = func.st_setsrid(func.st_geomfromtext(
                self._intersects.wkt), self._intersects.srid)
            where.append(func.st_intersects(
                geomcol, func.st_transform(
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
            _geom_format = self._geom_format
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
                        if self._geom_format == 'WKB':
                            geom_data = row['geom'].tobytes() if six.PY3 \
                                else six.binary_type(row['geom'])
                            geom = Geometry.from_wkb(geom_data, validate=False)
                        else:
                            geom = Geometry.from_wkt(row['geom'], validate=False)
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
                    [func.count(table.columns.id), ],
                    whereclause=db.and_(*where)
                )
                res = DBSession.connection().execute(query)
                for row in res:
                    return row[0]

        return QueryFeatureSet()
