from enum import Enum
from typing import List, Literal, Union

import geoalchemy2 as ga
from msgspec import Struct
from msgspec.structs import asdict as struct_asdict
from sqlalchemy import event, text
from sqlalchemy.ext.orderinglist import ordering_list
from sqlalchemy.orm import validates
from sqlalchemy.orm.attributes import set_committed_value

from nextgisweb.env import COMP_ID, Base, DBSession, gettext, pgettext
from nextgisweb.lib import db

from nextgisweb.auth import User
from nextgisweb.resource import Permission as P
from nextgisweb.resource import (
    Resource,
    ResourceGroup,
    ResourceScope,
    SAttribute,
    SColumn,
    Scope,
    Serializer,
    SRelationship,
    SResource,
)
from nextgisweb.resource.category import MapsAndServicesCategory
from nextgisweb.spatial_ref_sys import SRS

from .adapter import WebMapAdapter

Base.depends_on("resource")

ANNOTATIONS_DEFAULT_VALUES = ("no", "yes", "messages")


class WebMapScope(Scope):
    identity = "webmap"
    label = gettext("Web map")

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
    cls_display_name = gettext("Web map")
    cls_category = MapsAndServicesCategory
    cls_order = 20

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
    measure_srs_id = db.Column(db.ForeignKey(SRS.id, ondelete="SET NULL"), nullable=True)

    root_item = db.relationship("WebMapItem", cascade="all")

    bookmark_resource = db.relationship(
        Resource,
        foreign_keys=bookmark_resource_id,
        backref=db.backref("bookmarked_webmaps"),
    )

    measure_srs = db.relationship(SRS, foreign_keys=measure_srs_id)

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


def _item_default(item_type, default):
    def _default(context):
        if context.get_current_parameters()["item_type"] == item_type:
            return default

    return _default


class WebMapItem(Base):
    __tablename__ = "webmap_item"

    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey("webmap_item.id"))
    item_type = db.Column(db.Enum("root", "group", "layer"), nullable=False)
    position = db.Column(db.Integer, nullable=True)
    display_name = db.Column(db.Unicode, nullable=True)
    group_expanded = db.Column(db.Boolean, nullable=True, default=_item_default("group", False))
    group_exclusive = db.Column(db.Boolean, nullable=True, default=_item_default("group", False))
    layer_style_id = db.Column(db.ForeignKey(Resource.id), nullable=True)
    layer_enabled = db.Column(db.Boolean, nullable=True, default=_item_default("layer", False))
    layer_identifiable = db.Column(db.Boolean, nullable=True, default=_item_default("layer", True))
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
            data["group_exclusive"] = self.group_exclusive

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
                _set(item, "group_exclusive", True)

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


def _children_from_model(obj):
    result: List[Union["WebMapItemGroupRead", "WebMapItemLayerRead"]] = []
    for c in obj.children:
        if c.item_type == "layer":
            s = WebMapItemLayerRead.from_model(c)
        elif c.item_type == "group":
            s = WebMapItemGroupRead.from_model(c)
        else:
            raise NotImplementedError
        result.append(s)
    return result


class WebMapItemLayerRead(Struct, kw_only=True, tag="layer", tag_field="item_type"):
    display_name: str
    layer_enabled: bool
    layer_identifiable: bool
    layer_transparency: Union[float, None]
    layer_style_id: int
    style_parent_id: Union[int, None]
    layer_min_scale_denom: Union[int, None]
    layer_max_scale_denom: Union[int, None]
    layer_adapter: str
    draw_order_position: Union[int, None]
    legend_symbols: Union[LegendSymbolsEnum, None]

    @classmethod
    def from_model(cls, obj):
        style_parent_id = None
        if (style := obj.style) and (style_parent := style.parent):
            style_parent_id = style_parent.id

        return WebMapItemLayerRead(
            display_name=obj.display_name,
            layer_enabled=bool(obj.layer_enabled),
            layer_identifiable=bool(obj.layer_identifiable),
            layer_transparency=obj.layer_transparency,
            layer_style_id=obj.layer_style_id,
            layer_min_scale_denom=obj.layer_min_scale_denom,
            layer_max_scale_denom=obj.layer_max_scale_denom,
            layer_adapter=obj.layer_adapter,
            draw_order_position=obj.draw_order_position,
            legend_symbols=obj.legend_symbols,
            style_parent_id=style_parent_id,
        )


class WebMapItemLayerWrite(Struct, kw_only=True, tag="layer", tag_field="item_type"):
    display_name: str
    layer_enabled: bool = False
    layer_identifiable: bool = True
    layer_transparency: Union[float, None] = None
    layer_style_id: int
    layer_min_scale_denom: Union[int, None] = None
    layer_max_scale_denom: Union[int, None] = None
    layer_adapter: str
    draw_order_position: Union[int, None] = None
    legend_symbols: Union[LegendSymbolsEnum, None] = None

    def to_model(self):
        return WebMapItem(item_type="layer", **struct_asdict(self))


class WebMapItemGroupRead(Struct, kw_only=True, tag="group", tag_field="item_type"):
    display_name: str
    group_expanded: bool
    group_exclusive: bool
    children: List[Union["WebMapItemGroupRead", "WebMapItemLayerRead"]]

    @classmethod
    def from_model(cls, obj):
        return WebMapItemGroupRead(
            display_name=obj.display_name,
            group_expanded=bool(obj.group_expanded),
            group_exclusive=bool(obj.group_exclusive),
            children=_children_from_model(obj),
        )


class WebMapItemGroupWrite(Struct, kw_only=True, tag="group", tag_field="item_type"):
    display_name: str
    group_expanded: bool = False
    group_exclusive: bool = False
    children: List[Union["WebMapItemGroupWrite", "WebMapItemLayerWrite"]] = []

    def to_model(self):
        asdict = struct_asdict(self)
        children = [i.to_model() for i in asdict.pop("children")]
        result = WebMapItem(item_type="group", **asdict)
        if result.group_exclusive:
            enabled_child_found = False
            for child in reversed(children):
                if child.item_type == "layer" and child.layer_enabled:
                    if not enabled_child_found:
                        enabled_child_found = True
                    else:
                        child.layer_enabled = False
        result.children = children
        return result


class WebMapItemRootRead(Struct, kw_only=True):
    item_type: Literal["root"]
    children: List[Union["WebMapItemGroupRead", "WebMapItemLayerRead"]]

    @classmethod
    def from_model(cls, obj):
        return WebMapItemRootRead(
            item_type="root",
            children=_children_from_model(obj),
        )


class WebMapItemRootWrite(Struct, kw_only=True):
    item_type: Literal["root"] = "root"
    children: List[Union["WebMapItemGroupWrite", "WebMapItemLayerWrite"]] = []

    def to_model(self, obj):
        assert obj.item_type == self.item_type
        existing = list(obj.children)
        obj.children = [i.to_model() for i in self.children]
        for e in existing:
            DBSession.delete(e)


class RootItemAttr(SAttribute, apitype=True):
    def get(self, srlzr: Serializer) -> WebMapItemRootRead:
        return WebMapItemRootRead.from_model(srlzr.obj.root_item)

    def set(self, srlzr: Serializer, value: WebMapItemRootWrite, *, create: bool):
        value.to_model(srlzr.obj.root_item)


class WebMapSerializer(Serializer, apitype=True):
    identity = WebMap.identity
    resclass = WebMap

    extent_left = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    extent_right = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    extent_bottom = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    extent_top = SColumn(read=ResourceScope.read, write=ResourceScope.update)

    extent_const_left = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    extent_const_right = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    extent_const_bottom = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    extent_const_top = SColumn(read=ResourceScope.read, write=ResourceScope.update)

    draw_order_enabled = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    editable = SColumn(read=ResourceScope.read, write=ResourceScope.update)

    annotation_enabled = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    annotation_default = SColumn(read=ResourceScope.read, write=ResourceScope.update)

    legend_symbols = SColumn(read=ResourceScope.read, write=ResourceScope.update)

    measure_srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update)
    bookmark_resource = SResource(read=ResourceScope.read, write=ResourceScope.update)

    root_item = RootItemAttr(read=ResourceScope.read, write=ResourceScope.update)


@event.listens_for(SRS, "after_delete")
def check_measurement_srid(mapper, connection, target):
    sql = "DELETE FROM setting WHERE component = :c AND name = :n AND value::text::int = :v"
    connection.execute(text(sql), dict(c=COMP_ID, n="measurement_srid", v=target.id))
