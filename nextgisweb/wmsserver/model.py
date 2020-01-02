# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from .. import db
from ..models import declarative_base
from ..resource import (
    Resource,
    ServiceScope,
    Serializer,
    SerializedProperty as SP,
    ResourceGroup)

from .util import _

Base = declarative_base()


class Service(Base, Resource):
    identity = 'wmsserver_service'
    cls_display_name = _("WMS service")

    __scope__ = ServiceScope

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)


class Layer(Base):
    __tablename__ = 'wmsserver_layer'

    service_id = db.Column(db.ForeignKey('wmsserver_service.id'), primary_key=True)
    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    keyname = db.Column(db.Unicode, nullable=False)
    display_name = db.Column(db.Unicode, nullable=False)
    min_scale_denom = db.Column(db.Float, nullable=True)
    max_scale_denom = db.Column(db.Float, nullable=True)

    service = db.relationship(
        Service, foreign_keys=service_id,
        backref=db.backref('layers', cascade='all, delete-orphan'))

    resource = db.relationship(
        Resource, foreign_keys=resource_id,
        backref=db.backref('_wmsserver_layers', cascade='all'))

    def to_dict(self):
        return dict(
            keyname=self.keyname,
            display_name=self.display_name,
            resource_id=self.resource_id,
            min_scale_denom=self.min_scale_denom,
            max_scale_denom=self.max_scale_denom)


class _layers_attr(SP):

    def getter(self, srlzr):
        return [l.to_dict() for l in srlzr.obj.layers]

    def setter(self, srlzr, value):
        m = dict((l.resource_id, l) for l in srlzr.obj.layers)
        keep = set()
        for lv in value:
            if lv['resource_id'] in m:
                lo = m[lv['resource_id']]
                keep.add(lv['resource_id'])
            else:
                lo = Layer(resource_id=lv['resource_id'])
                srlzr.obj.layers.append(lo)

            for a in (
                'keyname', 'display_name',
                'min_scale_denom', 'max_scale_denom'
            ):
                setattr(lo, a, lv[a])

        for lrid, lo in m.items():
            if lrid not in keep:
                srlzr.obj.layers.remove(lo)


class ServiceSerializer(Serializer):
    identity = Service.identity
    resclass = Service

    layers = _layers_attr(
        read=ServiceScope.connect,
        write=ServiceScope.configure)
