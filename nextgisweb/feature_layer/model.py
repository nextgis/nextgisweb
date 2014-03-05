# -*- coding: utf-8 -*-
from collections import OrderedDict

import sqlalchemy as sa
import sqlalchemy.orm as orm
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.ext.orderinglist import ordering_list

from ..models import declarative_base
from ..resource import (
    Resource,
    MetaDataScope,
    Serializer,
    SerializedProperty as SP)

from .interface import FIELD_TYPE

Base = declarative_base()


class LayerField(Base):
    __tablename__ = 'layer_field'

    id = sa.Column(sa.Integer, primary_key=True)
    layer_id = sa.Column(sa.ForeignKey(Resource.id), nullable=False)
    cls = sa.Column(sa.Unicode, nullable=False)

    idx = sa.Column(sa.Integer, nullable=False)
    keyname = sa.Column(sa.Unicode, nullable=False)
    datatype = sa.Column(sa.Enum(*FIELD_TYPE.enum, native_enum=False),
                         nullable=False)
    display_name = sa.Column(sa.Unicode, nullable=False)
    grid_visibility = sa.Column(sa.Boolean, nullable=False, default=True)

    identity = __tablename__

    __mapper_args__ = {
        'polymorphic_identity': identity,
        'polymorphic_on': cls
    }

    layer = orm.relationship(
        Resource,
        primaryjoin='Resource.id == LayerField.layer_id',
    )

    def __unicode__(self):
        return self.display_name

    def to_dict(self):
        return dict([
            (c, getattr(self, c))
            for c in (
                'id', 'layer_id', 'cls',
                'idx', 'keyname', 'datatype',
                'display_name', 'grid_visibility',
            )
        ])


class LayerFieldsMixin(object):
    __field_class__ = LayerField

    @declared_attr
    def fields(cls):
        return orm.relationship(
            cls.__field_class__,
            foreign_keys=cls.__field_class__.layer_id,
            order_by=cls.__field_class__.idx,
            collection_class=ordering_list('idx'),
            cascade='all, delete-orphan',
            single_parent=True
        )

    @declared_attr
    def feature_label_field_id(cls):
        return sa.Column(
            "feature_label_field_id",
            sa.ForeignKey(cls.__field_class__.id)
        )

    @declared_attr
    def feature_label_field(cls):
        return orm.relationship(
            cls.__field_class__,
            uselist=False,
            primaryjoin="%s.id == %s.feature_label_field_id" % (
                cls.__field_class__.__name__, cls.__name__
            ),
            cascade='all',
            post_update=True
        )


class _fields_attr(SP):

    def getter(self, srlzr):
        return map(
            lambda f: OrderedDict((
                ('id', f.id), ('keyname', f.keyname),
                ('datatype', f.datatype), ('typemod', None),
                ('display_name', f.display_name),
                ('label_field', f == srlzr.obj.feature_label_field),
                ('grid_visibility', f.grid_visibility))),
            srlzr.obj.fields)

    def setter(self, srlzr, value):
        obj = srlzr.obj

        fldmap = dict()
        for idx, fld in reversed(list(enumerate(list(obj.fields)))):
            if fld.id:
                fldmap[fld.id] = fld
                obj.fields.pop(idx)

        obj.feature_label_field = None

        for fld in value:
            fldid = fld.get('id', None)

            if fldid:
                mfld = fldmap.get(fldid, None)
            else:
                mfld = obj.__field_class__(
                    datatype=fld['datatype'])

            if 'keyname' in fld:
                mfld.keyname = fld['keyname']
            if 'display_name' in fld:
                mfld.display_name = fld['display_name']
            if 'grid_visibility' in fld:
                mfld.grid_visibility = fld['grid_visibility']

            if fld.get('label_field', False):
                obj.feature_label_field = mfld

            obj.fields.append(mfld)

        obj.fields.reorder()


class FeatureLayerSerializer(Serializer):
    identity = 'feature_layer'
    resclass = LayerFieldsMixin

    fields = _fields_attr(read='view', write='edit', scope=MetaDataScope)
