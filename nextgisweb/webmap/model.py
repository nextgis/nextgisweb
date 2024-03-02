from enum import Enum

import geoalchemy2 as ga
from sqlalchemy import event, text
from sqlalchemy.ext.orderinglist import ordering_list
from sqlalchemy.orm import validates
from sqlalchemy.orm.attributes import set_committed_value

from nextgisweb.env import COMP_ID, Base, DBSession, _, pgettext
from nextgisweb.lib import db

from nextgisweb.auth import User
from nextgisweb.resource import Permission as P
from nextgisweb.resource import Resource, ResourceGroup, ResourceScope, Scope, Serializer
from nextgisweb.resource import SerializedProperty as SP
from nextgisweb.resource import SerializedResourceRelationship as SRR
from nextgisweb.spatial_ref_sys import SRS

from .adapter import WebMapAdapter

Base.depends_on("resource")

ANNOTATIONS_DEFAULT_VALUES = ("no", "yes", "messages")


class WebMapScope(Scope):
    identity = "webmap"
    label = _("Web map")

    display = P(pgettext("permission", "Display")).require(ResourceScope.read)
    annotation_read = P(pgettext("permission", "View annotations")).require(ResourceScope.read)
    annotation_write = P(pgettext("permission", "Draw annotations")).require(ResourceScope.read)
    annotation_manage = P(pgettext("permission", "Manage annotations")).require(annotation_write)


class LegendSymbolsEnum(Enum):
    EXPAND = "expand"
    COLLAPSE = "collapse"
    DISABLE = "disable"

    def __add__(self, other):
        return self if other is None else other


class WebMap(Base, Resource):
    identity = "webmap"
    cls_display_name = _("Web map")

    __scope__ = WebMapScope

    root_item_id = db.Column(db.ForeignKey("webmap_item.id"), nullable=False)
    bookmark_resource_id = db.Column(db.ForeignKey(Resource.id), nullable=True)
    draw_order_enabled = db.Column(db.Boolean, nullable=True)
    editable = db.Column(db.Boolean, nullable=False, default=False)

    extent_left = db.Column(db.Float, default=-180)
    extent_right = db.Column(db.Float, default=+180)
    extent_bottom = db.Column(db.Float, default=-90)
    extent_top = db.Column(db.Float, default=+90)

    extent_const_left = db.Column(db.Float)
    extent_const_right = db.Column(db.Float)
    extent_const_bottom = db.Column(db.Float)
    extent_const_top = db.Column(db.Float)

    annotation_enabled = db.Column(db.Boolean, nullable=False, default=False)
    annotation_default = db.Column(
        db.Enum(*ANNOTATIONS_DEFAULT_VALUES), nullable=False, default="no"
    )
    legend_symbols = db.Column(db.Enum(LegendSymbolsEnum), nullable=True)

    root_item = db.relationship("WebMapItem", cascade="all")

    bookmark_resource = db.relationship(
        Resource, foreign_keys=bookmark_resource_id, backref=db.backref("bookmarked_webmaps")
    )

    annotations = db.relationship(
        "WebMapAnnotation",
        back_populates="webmap",
        cascade="all,delete-orphan",
        cascade_backrefs=False,
    )

    def __init__(self, *args, **kwagrs):
        if "root_item" not in kwagrs:
            kwagrs["root_item"] = WebMapItem(item_type="root")
        super().__init__(*args, **kwagrs)

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
            extent_const=(
                self.extent_const_left,
                self.extent_const_bottom,
                self.extent_const_right,
                self.extent_const_top,
            ),
        )

    def from_dict(self, data):
        for k in (
            "display_name",
            "bookmark_resource_id",
            "editable",
        ):
            if k in data:
                setattr(self, k, data[k])

        if "root_item" in data:
            self.root_item.from_dict(data["root_item"])

        if "extent" in data:
            self.extent_left, self.extent_bottom, self.extent_right, self.extent_top = data[
                "extent"
            ]

        if "extent_const" in data:
            (
                self.extent_const_left,
                self.extent_const_bottom,
                self.extent_const_right,
                self.extent_const_top,
            ) = data["extent_const"]


def _layer_enabled_default(context):
    if context.get_current_parameters()["item_type"] == "layer":
        return False


def _layer_identifiable_default(context):
    if context.get_current_parameters()["item_type"] == "layer":
        return True


class WebMapItem(Base):
    __tablename__ = "webmap_item"

    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey("webmap_item.id"))
    item_type = db.Column(db.Enum("root", "group", "layer"), nullable=False)
    position = db.Column(db.Integer, nullable=True)
    display_name = db.Column(db.Unicode, nullable=True)
    group_expanded = db.Column(db.Boolean, nullable=True)
    layer_style_id = db.Column(db.ForeignKey(Resource.id), nullable=True)
    layer_enabled = db.Column(db.Boolean, nullable=True, default=_layer_enabled_default)
    layer_identifiable = db.Column(db.Boolean, nullable=True, default=_layer_identifiable_default)
    layer_transparency = db.Column(db.Float, nullable=True)
    layer_min_scale_denom = db.Column(db.Float, nullable=True)
    layer_max_scale_denom = db.Column(db.Float, nullable=True)
    layer_adapter = db.Column(db.Enum(*WebMapAdapter.registry.keys()), nullable=True)
    draw_order_position = db.Column(db.Integer, nullable=True)
    legend_symbols = db.Column(db.Enum(LegendSymbolsEnum), nullable=True)

    parent = db.relationship(
        "WebMapItem",
        remote_side=id,
        cascade_backrefs=False,
        backref=db.backref(
            "children",
            order_by=position,
            cascade="all, delete-orphan",
            collection_class=ordering_list("position"),
        ),
    )

    style = db.relationship(
        "Resource",
        # Temporary solution that allows to automatically
        # remove web-map elements when style is removed
        backref=db.backref(
            "webmap_items",
            cascade="all",
            cascade_backrefs=False,
        ),
    )

    def to_dict(self):
        data = dict(item_type=self.item_type)

        if self.item_type in ("group", "layer"):
            data["display_name"] = self.display_name

        if self.item_type == "group":
            data["group_expanded"] = self.group_expanded

        if self.item_type in ("root", "group"):
            data["children"] = [i.to_dict() for i in self.children]

        if self.item_type == "layer":
            style_parent_id = None
            if self.style and self.style.parent:
                style = self.style
                style_parent_id = style.parent.id

            data.update(
                layer_enabled=self.layer_enabled,
                layer_identifiable=self.layer_identifiable,
                layer_transparency=self.layer_transparency,
                layer_style_id=self.layer_style_id,
                layer_min_scale_denom=self.layer_min_scale_denom,
                layer_max_scale_denom=self.layer_max_scale_denom,
                layer_adapter=self.layer_adapter,
                draw_order_position=self.draw_order_position,
                legend_symbols=self.legend_symbols,
                style_parent_id=style_parent_id,
            )

        return data

    def from_dict(self, data):
        assert data["item_type"] == self.item_type
        if data["item_type"] in ("root", "group") and "children" in data:
            self.children = []
            for i in data["children"]:
                child = WebMapItem(parent=self, item_type=i["item_type"])
                child.from_dict(i)
                self.children.append(child)

        for a in (
            "display_name",
            "group_expanded",
            "layer_enabled",
            "layer_identifiable",
            "layer_adapter",
            "layer_style_id",
            "layer_transparency",
            "layer_min_scale_denom",
            "layer_max_scale_denom",
            "draw_order_position",
            "legend_symbols",
        ):
            if a in data:
                setattr(self, a, data[a])

    def from_children(self, children, *, defaults=dict()):
        assert self.item_type in ("root", "group")

        for child in children:

            def _set(item, k, default=False):
                if k in child:
                    setattr(item, k, child[k])
                elif default and k in defaults:
                    setattr(item, k, defaults[k])

            assert ("style" in child) != ("children" in child)

            if "children" in child:
                item = WebMapItem(item_type="group")
                _set(item, "group_expanded", True)

                defaults_next = defaults.copy()
                if "defaults" in child:
                    defaults_next.update(child["defaults"])
                item.from_children(child["children"], defaults=defaults_next)
            else:
                item = WebMapItem(item_type="layer", style=child["style"])
                _set(item, "draw_order_position")
                for k in (
                    "layer_enabled",
                    "layer_identifiable",
                    "layer_transparency",
                    "layer_min_scale_denom",
                    "layer_max_scale_denom",
                    "layer_adapter",
                    "legend_symbols",
                ):
                    _set(item, k, True)

            _set(item, "display_name")

            self.children.append(item)

    def scale_range(self):
        return (self.layer_min_scale_denom, self.layer_max_scale_denom)


@event.listens_for(WebMapItem, "load")
def load_webmap_item_children(target, context):
    if target.item_type == "layer":
        set_committed_value(target, "children", ())


class WebMapAnnotation(Base):
    __tablename__ = "webmap_annotation"

    id = db.Column(db.Integer, primary_key=True)
    webmap_id = db.Column(db.ForeignKey(WebMap.id), nullable=False)
    description = db.Column(db.Unicode)
    style = db.Column(db.JSONB)
    geom = db.Column(ga.Geometry(dimension=2, srid=3857), nullable=False)
    public = db.Column(db.Boolean, nullable=False, default=True)
    user_id = db.Column(db.ForeignKey(User.id), nullable=True)

    webmap = db.relationship(WebMap, back_populates="annotations")
    user = db.relationship(
        User,
        backref=db.backref(
            "webmap_annotations",
            cascade="all, delete-orphan",
        ),
    )

    @validates("public", "user_id")
    def validates_read_only_fields(self, key, value):
        val = getattr(self, key)
        if val or val is False:
            raise ValueError("WebMapAnnotation.%s cannot be modified." % key)
        return value


PR_READ = ResourceScope.read
PR_UPDATE = ResourceScope.update

_mdargs = dict(read=PR_READ, write=PR_UPDATE)


class _root_item_attr(SP):
    def getter(self, srlzr):
        return srlzr.obj.root_item.to_dict()

    def setter(self, srlzr, value):
        children = list(srlzr.obj.root_item.children)
        srlzr.obj.root_item.children = []
        for child in children:
            DBSession.delete(child)

        srlzr.obj.root_item.from_dict(value)


class WebMapSerializer(Serializer):
    identity = WebMap.identity
    resclass = WebMap

    extent_left = SP(**_mdargs)
    extent_right = SP(**_mdargs)
    extent_bottom = SP(**_mdargs)
    extent_top = SP(**_mdargs)

    extent_const_left = SP(**_mdargs)
    extent_const_right = SP(**_mdargs)
    extent_const_bottom = SP(**_mdargs)
    extent_const_top = SP(**_mdargs)

    draw_order_enabled = SP(**_mdargs)
    editable = SP(**_mdargs)

    annotation_enabled = SP(**_mdargs)
    annotation_default = SP(**_mdargs)

    legend_symbols = SP(**_mdargs)

    bookmark_resource = SRR(**_mdargs)

    root_item = _root_item_attr(**_mdargs)


@event.listens_for(SRS, "after_delete")
def check_measurement_srid(mapper, connection, target):
    sql = "DELETE FROM setting WHERE component = :c AND name = :n AND value::text::int = :v"
    connection.execute(text(sql), dict(c=COMP_ID, n="measurement_srid", v=target.id))
