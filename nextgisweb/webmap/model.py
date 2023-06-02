import geoalchemy2 as ga
from sqlalchemy import event, text, Enum
from sqlalchemy.ext.orderinglist import ordering_list
from sqlalchemy.orm import validates

from .util import _
from ..lib import db
from ..auth import User
from ..env import env
from ..env.model import declarative_base
from ..resource import (
    Resource,
    Scope,
    Permission,
    ResourceScope,
    Serializer,
    SerializedProperty as SP,
    SerializedResourceRelationship as SRR,
    ResourceGroup)
from ..spatial_ref_sys import SRS

Base = declarative_base(dependencies=('resource', ))

ANNOTATIONS_DEFAULT_VALUES = ('no', 'yes', 'messages')


class WebMapScope(Scope):
    identity = 'webmap'
    label = _("Web map")

    display = Permission(_("Display")).require(ResourceScope.read)
    annotation_read = Permission(_("View annotations")).require(ResourceScope.read)
    annotation_write = Permission(_("Edit annotations")).require(ResourceScope.read)
    annotation_manage = Permission(_("Manage annotations")).require(annotation_write)


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
    extent_constrained = db.Column(db.Boolean, default=False)

    annotation_enabled = db.Column(db.Boolean, nullable=False, default=False)
    annotation_default = db.Column(db.Enum(*ANNOTATIONS_DEFAULT_VALUES), nullable=False, default='no')
    legend_visible = db.Column(db.Enum('default', 'on', 'off', 'disable'), nullable=False, default='default')

    root_item = db.relationship('WebMapItem', cascade='all')

    bookmark_resource = db.relationship(
        Resource, foreign_keys=bookmark_resource_id,
        backref=db.backref('bookmarked_webmaps'))

    annotations = db.relationship(
        'WebMapAnnotation', back_populates='webmap',
        cascade='all,delete-orphan', cascade_backrefs=False)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    @classmethod
    def check_social_editable(cls):
        return True

    def to_dict(self):
        return dict(
            id=self.id,
            display_name=self.display_name,
            editable=self.editable,
            root_item=self.root_item.to_dict(),
            bookmark_resource_id=self.bookmark_resource_id,
            extent=(
                self.extent_left if self.extent_left is not None else -180,
                self.extent_bottom if self.extent_bottom is not None else -90,
                self.extent_right if self.extent_right is not None else +180,
                self.extent_top if self.extent_top is not None else +90,
            ),
            extent_constrained=self.extent_constrained,
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

        if 'extent_constrained' in data:
            self.extent_constrained = data['extent_constrained']

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

    def layer_enabled_default(context):
        if context.get_current_parameters()['item_type'] == 'layer':
            return False
    layer_enabled = db.Column(db.Boolean, nullable=True, default=layer_enabled_default)

    def layer_identifiable_default(context):
        if context.get_current_parameters()['item_type'] == 'layer':
            return True
    layer_identifiable = db.Column(db.Boolean, nullable=True, default=layer_identifiable_default)
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

    legend_visible = db.Column(db.Enum('default', 'on', 'off', 'disable'), nullable=True, default='default')

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
            payload = None
            if self.style and self.style.parent:
                style = self.style
                style_parent_id = style.parent.id

                if hasattr(style, 'payload') or isinstance(
                    getattr(type(style), 'payload', None), property
                ):
                    payload = style.payload

            return dict(
                item_type=self.item_type,
                display_name=self.display_name,
                layer_enabled=self.layer_enabled,
                layer_identifiable=self.layer_identifiable,
                layer_transparency=self.layer_transparency,
                layer_style_id=self.layer_style_id,
                style_parent_id=style_parent_id,
                layer_min_scale_denom=self.layer_min_scale_denom,
                layer_max_scale_denom=self.layer_max_scale_denom,
                layer_adapter=self.layer_adapter,
                draw_order_position=self.draw_order_position,
                legend_visible=self.legend_visible,
                payload=payload
            )

    def from_dict(self, data):
        assert data['item_type'] == self.item_type
        if data['item_type'] in ('root', 'group') and 'children' in data:
            self.children = []
            for i in data['children']:
                child = WebMapItem(parent=self, item_type=i['item_type'])
                child.from_dict(i)
                self.children.append(child)

        for a in ('display_name', 'group_expanded', 'layer_enabled', 'layer_identifiable',
                  'layer_adapter', 'layer_style_id', 'layer_transparency',
                  'layer_min_scale_denom', 'layer_max_scale_denom',
                  'draw_order_position', 'legend_visible'):
            if a in data:
                setattr(self, a, data[a])


class WebMapAnnotation(Base):
    __tablename__ = 'webmap_annotation'

    id = db.Column(db.Integer, primary_key=True)
    webmap_id = db.Column(db.ForeignKey(WebMap.id), nullable=False)
    description = db.Column(db.Unicode)
    style = db.Column(db.JSONB)
    geom = db.Column(ga.Geometry(dimension=2, srid=3857), nullable=False)
    public = db.Column(db.Boolean, nullable=False, default=True)
    user_id = db.Column(db.ForeignKey(User.id), nullable=True)

    webmap = db.relationship(WebMap, back_populates='annotations')
    user = db.relationship(User, backref=db.backref(
        'webmap_annotations',
        cascade='all, delete-orphan',
    ))

    @validates('public', 'user_id')
    def validates_read_only_fields(self, key, value):
        val = getattr(self, key)
        if val or val is False:
            raise ValueError('WebMapAnnotation.%s cannot be modified.' % key)
        return value


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
    extent_constrained = SP(**_mdargs)

    draw_order_enabled = SP(**_mdargs)
    editable = SP(**_mdargs)

    annotation_enabled = SP(**_mdargs)
    annotation_default = SP(**_mdargs)

    legend_visible = SP(**_mdargs)

    bookmark_resource = SRR(**_mdargs)

    root_item = _root_item_attr(**_mdargs)


WM_SETTINGS = dict(
    identify_radius=3,
    identify_attributes=True,
    show_geometry_info=False,
    popup_width=300,
    popup_height=200,
    address_search_enabled=True,
    address_search_extent=False,
    address_geocoder='nominatim',
    yandex_api_geocoder_key='',
    nominatim_countrycodes='',
    units_length='m',
    units_area='sq.m',
    degree_format='dd',
    measurement_srid=4326,
    legend_visible='default'
)


@event.listens_for(SRS, 'after_delete')
def check_measurement_srid(mapper, connection, target):
    try:
        measurement_srid = env.core.settings_get('webmap', 'measurement_srid')
    except KeyError:
        return

    if measurement_srid == target.id:
        srid_default = WM_SETTINGS['measurement_srid']
        connection.execute(text("""
            UPDATE setting SET value = :srid
            WHERE component = 'webmap' AND name = 'measurement_srid'
        """), dict(srid=srid_default))
