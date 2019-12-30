# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import json

from sqlalchemy.ext.orderinglist import ordering_list
from sqlalchemy.types import TypeDecorator
import geoalchemy2 as ga

from .. import db
from ..models import declarative_base
from ..resource import (
    Resource,
    Scope,
    Permission,
    ResourceScope,
    Serializer,
    SerializedProperty as SP,
    SerializedResourceRelationship as SRR,
    ResourceGroup)

from .util import _

Base = declarative_base()


class WebMapScope(Scope):
    identity = 'webmap'
    label = _("Web map")

    display = Permission(_("Display"))
    annotation_read = Permission(_("View annotations"))
    annotation_write = Permission(_("Edit annotations"))


class WebMap(Base, Resource):
    identity = 'webmap'
    cls_display_name = _("Web map")

    __scope__ = WebMapScope

    root_item_id = db.Column(db.ForeignKey('webmap_item.id'), nullable=False)
    bookmark_resource_id = db.Column(db.ForeignKey(Resource.id), nullable=True)
    draw_order_enabled = db.Column(db.Boolean, nullable=True)
    editable = db.Column(db.Boolean, nullable=False, default=False)

    extent_left = db.Column(db.Float, default=-180)
    extent_right = db.Column(db.Float, default=+180)
    extent_bottom = db.Column(db.Float, default=-90)
    extent_top = db.Column(db.Float, default=+90)

    annotation_enabled = db.Column(db.Boolean, nullable=False, default=False)
    annotation_default = db.Column(db.Boolean, nullable=False, default=False)

    root_item = db.relationship('WebMapItem', cascade='all')

    bookmark_resource = db.relationship(
        Resource, foreign_keys=bookmark_resource_id,
        backref=db.backref('bookmarked_webmaps'))

    annotations = db.relationship('WebMapAnnotation', cascade='all,delete-orphan')

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def to_dict(self):
        return dict(
            id=self.id,
            display_name=self.display_name,
            editable=self.editable,
            root_item=self.root_item.to_dict(),
            bookmark_resource_id=self.bookmark_resource_id,
            extent=(self.extent_left, self.extent_bottom,
                    self.extent_right, self.extent_top),
        )

    def from_dict(self, data):
        if 'display_name' in data:
            self.display_name = data['display_name']

        if 'root_item' in data:
            self.root_item = WebMapItem(item_type='root')
            self.root_item.from_dict(data['root_item'])

        if 'bookmark_resource_id' in data:
            self.bookmark_resource_id = data['bookmark_resource_id']

        if 'extent' in data:
            self.extent_left, self.extent_bottom, \
            self.extent_right, self.extent_top = data['extent']

        if 'editable' in data:
            self.editable = data['editable']


class WebMapItem(Base):
    __tablename__ = 'webmap_item'

    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('webmap_item.id'))
    item_type = db.Column(db.Enum('root', 'group', 'layer'), nullable=False)
    position = db.Column(db.Integer, nullable=True)
    display_name = db.Column(db.Unicode, nullable=True)
    group_expanded = db.Column(db.Boolean, nullable=True)
    layer_style_id = db.Column(db.ForeignKey(Resource.id), nullable=True)
    layer_enabled = db.Column(db.Boolean, nullable=True)
    layer_transparency = db.Column(db.Float, nullable=True)
    layer_min_scale_denom = db.Column(db.Float, nullable=True)
    layer_max_scale_denom = db.Column(db.Float, nullable=True)
    layer_adapter = db.Column(db.Unicode, nullable=True)
    draw_order_position = db.Column(db.Integer, nullable=True)

    parent = db.relationship(
        'WebMapItem', remote_side=id, backref=db.backref(
            'children', order_by=position, cascade='all, delete-orphan',
            collection_class=ordering_list('position')))

    style = db.relationship(
        'Resource',
        # Temporary solution that allows to automatically
        # remove web-map elements when style is removed
        backref=db.backref('webmap_items', cascade='all')
    )

    def to_dict(self):
        if self.item_type in ('root', 'group'):
            children = list(self.children)
            sorted(children, key=lambda c: c.position)

            if self.item_type == 'root':
                return dict(
                    item_type=self.item_type,
                    children=[i.to_dict() for i in children],
                )

            elif self.item_type == 'group':
                return dict(
                    item_type=self.item_type,
                    display_name=self.display_name,
                    group_expanded=self.group_expanded,
                    children=[i.to_dict() for i in children],
                )

        elif self.item_type == 'layer':
            style_parent_id = None
            if self.style and self.style.parent:
                style_parent_id = self.style.parent.id

            return dict(
                item_type=self.item_type,
                display_name=self.display_name,
                layer_enabled=self.layer_enabled,
                layer_transparency=self.layer_transparency,
                layer_style_id=self.layer_style_id,
                style_parent_id=style_parent_id,
                layer_min_scale_denom=self.layer_min_scale_denom,
                layer_max_scale_denom=self.layer_max_scale_denom,
                layer_adapter=self.layer_adapter,
                draw_order_position=self.draw_order_position,
            )

    def from_dict(self, data):
        assert data['item_type'] == self.item_type
        if data['item_type'] in ('root', 'group') and 'children' in data:
            self.children = []
            for i in data['children']:
                child = WebMapItem(parent=self, item_type=i['item_type'])
                child.from_dict(i)
                self.children.append(child)

        for a in ('display_name', 'group_expanded', 'layer_enabled',
                  'layer_adapter', 'layer_style_id', 'layer_transparency',
                  'layer_min_scale_denom', 'layer_max_scale_denom',
                  'draw_order_position'):

            if a in data:
                setattr(self, a, data[a])


class JSONTextType(TypeDecorator):
    """ SA type decorator for JSON stored as text """

    impl = db.Unicode

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if not value:
            return None
        return json.loads(value)


class WebMapAnnotation(Base):
    __tablename__ = 'webmap_annotation'

    id = db.Column(db.Integer, primary_key=True)
    webmap_id = db.Column(db.ForeignKey(WebMap.id), nullable=False)
    description = db.Column(db.Unicode)
    style = db.Column(JSONTextType)
    geom = db.Column(ga.Geometry(dimension=2, srid=3857), nullable=False)

    webmap = db.relationship(WebMap)


PR_READ = ResourceScope.read
PR_UPDATE = ResourceScope.update

_mdargs = dict(read=PR_READ, write=PR_UPDATE)


class _root_item_attr(SP):

    def getter(self, srlzr):
        return srlzr.obj.root_item.to_dict()

    def setter(self, srlzr, value):
        if srlzr.obj.root_item is None:
            srlzr.obj.root_item = WebMapItem(item_type='root')

        srlzr.obj.root_item.from_dict(value)


class WebMapSerializer(Serializer):
    identity = WebMap.identity
    resclass = WebMap

    extent_left = SP(**_mdargs)
    extent_right = SP(**_mdargs)
    extent_bottom = SP(**_mdargs)
    extent_top = SP(**_mdargs)

    draw_order_enabled = SP(**_mdargs)
    editable = SP(**_mdargs)

    annotation_enabled = SP(**_mdargs)
    annotation_default = SP(**_mdargs)

    bookmark_resource = SRR(**_mdargs)

    root_item = _root_item_attr(**_mdargs)
