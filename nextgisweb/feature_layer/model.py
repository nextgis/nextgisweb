# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from collections import OrderedDict

from osgeo import ogr, osr
from six import ensure_str
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.ext.orderinglist import ordering_list

from .. import db
from ..models import declarative_base
from ..resource import (
    Resource,
    DataStructureScope,
    Serializer,
    SerializedProperty as SP)
from ..resource.exception import ValidationError
from ..lookup_table import LookupTable

from .interface import (
    FIELD_TYPE,
    FIELD_TYPE_OGR)

from .util import _

Base = declarative_base(dependencies=('resource', 'lookup_table'))

_FIELD_TYPE_2_ENUM_REVERSED = dict(zip(FIELD_TYPE.enum, FIELD_TYPE_OGR))


class LayerField(Base):
    __tablename__ = 'layer_field'

    id = db.Column(db.Integer, primary_key=True)
    layer_id = db.Column(db.ForeignKey(Resource.id), nullable=False)
    cls = db.Column(db.Unicode, nullable=False)

    idx = db.Column(db.Integer, nullable=False)
    keyname = db.Column(db.Unicode, nullable=False)
    datatype = db.Column(db.Enum(*FIELD_TYPE.enum), nullable=False)
    display_name = db.Column(db.Unicode, nullable=False)
    grid_visibility = db.Column(db.Boolean, nullable=False, default=True)
    lookup_table_id = db.Column(db.ForeignKey(LookupTable.id))

    identity = __tablename__

    __mapper_args__ = {
        'polymorphic_identity': identity,
        'polymorphic_on': cls
    }
    __table_args__ = (
        db.UniqueConstraint(layer_id, keyname),
        db.UniqueConstraint(layer_id, display_name),
    )

    layer = db.relationship(
        Resource, primaryjoin='Resource.id == LayerField.layer_id')

    lookup_table = db.relationship(
        LookupTable, primaryjoin='LayerField.lookup_table_id == LookupTable.id')

    def __str__(self):
        return self.display_name

    def __unicode__(self):
        return self.__str__()

    def to_dict(self):
        return dict(
            (c, getattr(self, c))
            for c in (
                'id', 'layer_id', 'cls',
                'idx', 'keyname', 'datatype',
                'display_name', 'grid_visibility',
            )
        )


class LayerFieldsMixin(object):
    __field_class__ = LayerField
    __scope__ = DataStructureScope

    @declared_attr
    def fields(cls):
        return db.relationship(
            cls.__field_class__,
            foreign_keys=cls.__field_class__.layer_id,
            order_by=cls.__field_class__.idx,
            collection_class=ordering_list('idx'),
            cascade='all, delete-orphan',
            single_parent=True
        )

    @declared_attr
    def feature_label_field_id(cls):
        return db.Column(
            "feature_label_field_id",
            db.ForeignKey(cls.__field_class__.id)
        )

    @declared_attr
    def feature_label_field(cls):
        return db.relationship(
            cls.__field_class__,
            uselist=False,
            primaryjoin="%s.id == %s.feature_label_field_id" % (
                cls.__field_class__.__name__, cls.__name__
            ),
            cascade='all',
            post_update=True
        )

    def to_ogr(self, ogr_ds, name=r'', fid=None):
        srs = osr.SpatialReference()
        srs.ImportFromEPSG(self.srs.id)
        ogr_layer = ogr_ds.CreateLayer(ensure_str(name), srs=srs)
        for field in self.fields:
            ogr_layer.CreateField(
                ogr.FieldDefn(
                    ensure_str(field.keyname),
                    _FIELD_TYPE_2_ENUM_REVERSED[field.datatype],
                )
            )
        if fid is not None:
            ogr_layer.CreateField(
                ogr.FieldDefn(
                    ensure_str(fid),
                    ogr.OFTInteger
                )
            )
        return ogr_layer


class _fields_attr(SP):

    def getter(self, srlzr):
        return [OrderedDict((
            ('id', f.id), ('keyname', f.keyname),
            ('datatype', f.datatype), ('typemod', None),
            ('display_name', f.display_name),
            ('label_field', f == srlzr.obj.feature_label_field),
            ('grid_visibility', f.grid_visibility),
            ('lookup_table', (
                dict(id=f.lookup_table.id)
                if f.lookup_table else None)),
        )) for f in srlzr.obj.fields]

    def setter(self, srlzr, value):
        obj = srlzr.obj

        fldmap = dict()
        for fld in obj.fields:
            fldmap[fld.id] = fld

        obj.feature_label_field = None

        new_fields = list()

        for fld in value:
            fldid = fld.get('id')

            if fldid is not None:
                try:
                    mfld = fldmap.pop(fldid)  # update
                except KeyError:
                    raise ValidationError(_("Field not found (ID=%d)." % fldid))

                if fld.get('delete', False):
                    obj.field_delete(mfld)  # delete
                    continue
            else:
                mfld = obj.field_create(fld['datatype'])  # create

            if 'keyname' in fld:
                mfld.keyname = fld['keyname']
            if 'display_name' in fld:
                mfld.display_name = fld['display_name']
            if 'grid_visibility' in fld:
                mfld.grid_visibility = fld['grid_visibility']
            if 'lookup_table' in fld:
                # TODO: Handle errors: wrong schema, missing lookup table
                mfld.lookup_table = LookupTable.filter_by(
                    id=fld['lookup_table']['id']).one()

            if fld.get('label_field', False):
                obj.feature_label_field = mfld

            new_fields.append(mfld)

        for mfld in fldmap.values():
            new_fields.append(mfld)  # Keep not mentioned fields

        # Check unique names
        fields_len = len(new_fields)
        for i in range(fields_len):
            keyname = new_fields[i].keyname
            display_name = new_fields[i].display_name
            for j in range(i + 1, fields_len):
                if keyname == new_fields[j].keyname:
                    raise ValidationError("Field keyname (%s) is not unique." % keyname)
                if display_name == new_fields[j].display_name:
                    raise ValidationError("Field display_name (%s) is not unique." % display_name)

        obj.fields = new_fields
        obj.fields.reorder()


P_DSS_READ = DataStructureScope.read
P_DSS_WRITE = DataStructureScope.write


class FeatureLayerSerializer(Serializer):
    identity = 'feature_layer'
    resclass = LayerFieldsMixin

    fields = _fields_attr(read=P_DSS_READ, write=P_DSS_WRITE)
