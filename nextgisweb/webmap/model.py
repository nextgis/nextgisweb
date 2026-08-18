from enum import Enum
from functools import partial
from typing import TYPE_CHECKING, Annotated, Literal, Type

import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
import sqlalchemy.event as sa_event
import sqlalchemy.orm as orm
from msgspec import UNSET, Meta, Struct, UnsetType
from msgspec.structs import asdict as struct_asdict
from sqlalchemy import text
from sqlalchemy.ext.orderinglist import ordering_list
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm.attributes import set_committed_value

from nextgisweb.env import COMP_ID, Base, DBSession, gettext, pgettext
from nextgisweb.lib import saext
from nextgisweb.lib.msext import DEPRECATED

from nextgisweb.auth import User
from nextgisweb.core.exception import ValidationError
from nextgisweb.resource import (
    CRUTypes,
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
from nextgisweb.resource import Permission as P
from nextgisweb.resource.category import MapsAndServicesCategory
from nextgisweb.spatial_ref_sys import SRS

from .adapter import WebMapAdapter
from .option import WebMapOption

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


class WebMap(Resource):
    identity = "webmap"
    cls_display_name = gettext("Web map")
    cls_category = MapsAndServicesCategory
    cls_order = 20

    __scope__ = WebMapScope

    root_item_id: Mapped[int] = mapped_column(sa.ForeignKey("webmap_item.id"))
    bookmark_resource_id: Mapped[int | None] = mapped_column(sa.ForeignKey(Resource.id))
    draw_order_enabled: Mapped[bool | None] = mapped_column(sa.Boolean)
    editable: Mapped[bool] = mapped_column(sa.Boolean, default=True)

    extent_left: Mapped[float | None] = mapped_column(sa.Float, default=-180)
    extent_right: Mapped[float | None] = mapped_column(sa.Float, default=+180)
    extent_bottom: Mapped[float | None] = mapped_column(sa.Float, default=-90)
    extent_top: Mapped[float | None] = mapped_column(sa.Float, default=+90)

    extent_const_left: Mapped[float | None] = mapped_column(sa.Float)
    extent_const_right: Mapped[float | None] = mapped_column(sa.Float)
    extent_const_bottom: Mapped[float | None] = mapped_column(sa.Float)
    extent_const_top: Mapped[float | None] = mapped_column(sa.Float)

    title: Mapped[str | None] = mapped_column(sa.Unicode)

    annotation_enabled: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    annotation_default: Mapped[str] = mapped_column(
        saext.Enum(*ANNOTATIONS_DEFAULT_VALUES), default="no"
    )
    legend_symbols: Mapped[LegendSymbolsEnum | None] = mapped_column(saext.Enum(LegendSymbolsEnum))
    measure_srs_id: Mapped[int | None] = mapped_column(sa.ForeignKey(SRS.id, ondelete="SET NULL"))
    options: Mapped[dict] = mapped_column(saext.Msgspec(dict[str, bool]), default=dict)

    root_item: Mapped["WebMapItem"] = orm.relationship(cascade="all")

    bookmark_resource: Mapped[Resource | None] = orm.relationship(
        foreign_keys=bookmark_resource_id,
        backref=orm.backref("bookmarked_webmaps"),
    )

    measure_srs: Mapped[SRS | None] = orm.relationship(foreign_keys=measure_srs_id)

    annotations: Mapped[list["WebMapAnnotation"]] = orm.relationship(
        cascade="all,delete-orphan",
        back_populates="webmap",
    )

    if TYPE_CHECKING:
        from nextgisweb.basemap.model import BasemapWebMap, BasemapWebMapConfig

        # NOTE: Defined in nextgisweb.basemap.model
        basemaps: Mapped[list[BasemapWebMap]]
        basemap_config: Mapped[BasemapWebMapConfig | None]

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


def _default_factory(item_type, default):
    def _default(context):
        if context.get_current_parameters()["item_type"] == item_type:
            return default

    return _default


_gdefault = partial(_default_factory, "group")
_ldefault = partial(_default_factory, "layer")


class WebMapItem(Base):
    __tablename__ = "webmap_item"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    parent_id: Mapped[int | None] = mapped_column(sa.Integer, sa.ForeignKey("webmap_item.id"))
    item_type: Mapped[str] = mapped_column(saext.Enum("root", "group", "layer"))
    position: Mapped[int | None] = mapped_column(sa.Integer)
    display_name: Mapped[str | None] = mapped_column(sa.Unicode)
    group_expanded: Mapped[bool | None] = mapped_column(sa.Boolean, default=_gdefault(False))
    group_enabled: Mapped[bool | None] = mapped_column(sa.Boolean, default=_gdefault(True))
    group_exclusive: Mapped[bool | None] = mapped_column(sa.Boolean, default=_gdefault(False))
    layer_style_id: Mapped[int | None] = mapped_column(sa.ForeignKey(Resource.id))
    layer_enabled: Mapped[bool | None] = mapped_column(sa.Boolean, default=_ldefault(False))
    layer_identifiable: Mapped[bool | None] = mapped_column(sa.Boolean, default=_ldefault(True))
    layer_transparency: Mapped[float | None] = mapped_column(sa.Float)
    layer_min_scale_denom: Mapped[float | None] = mapped_column(sa.Float)
    layer_max_scale_denom: Mapped[float | None] = mapped_column(sa.Float)
    layer_adapter: Mapped[str | None] = mapped_column(saext.Enum(*WebMapAdapter.registry.keys()))
    draw_order_position: Mapped[int | None] = mapped_column(sa.Integer)
    legend_symbols: Mapped[LegendSymbolsEnum | None] = mapped_column(saext.Enum(LegendSymbolsEnum))

    parent: Mapped["WebMapItem | None"] = orm.relationship(
        remote_side=id,
        back_populates="children",
    )

    children: Mapped[list["WebMapItem"]] = orm.relationship(
        order_by=position,
        collection_class=ordering_list("position"),
        cascade="all,delete-orphan",
        back_populates="parent",
    )

    style: Mapped[Resource | None] = orm.relationship(
        # Temporary solution that allows to automatically
        # remove web-map elements when style is removed
        backref=orm.backref(
            "webmap_items",
            cascade="all,delete-orphan",
        ),
    )

    def from_children(self, children, *, defaults=dict()):
        assert self.item_type in ("root", "group")

        for child in children:

            def _set(item, k, *, use_defaults=False):
                if k in child:
                    setattr(item, k, child[k])
                elif use_defaults and k in defaults:
                    setattr(item, k, defaults[k])

            assert ("style" in child) != ("children" in child)

            if "children" in child:
                item = WebMapItem(item_type="group")
                _set(item, "group_expanded", use_defaults=True)
                _set(item, "group_enabled", use_defaults=True)
                _set(item, "group_exclusive", use_defaults=True)

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
                    "layer_opacity",
                    "layer_min_scale_denom",
                    "layer_max_scale_denom",
                    "layer_adapter",
                    "legend_symbols",
                ):
                    _set(item, k, use_defaults=True)

            _set(item, "display_name")

            self.children.append(item)

    def scale_range(self):
        return (self.layer_min_scale_denom, self.layer_max_scale_denom)

    @property
    def layer_opacity(self) -> float | None:
        transparency = self.layer_transparency
        return (100 - transparency) / 100 if transparency is not None else None

    @layer_opacity.setter
    def layer_opacity(self, value: float | None):
        self.layer_transparency = (1 - value) * 100 if value is not None else None


@sa_event.listens_for(WebMapItem, "load")
def load_webmap_item_children(target, context):
    if target.item_type == "layer":
        set_committed_value(target, "children", ())


class WebMapAnnotation(Base):
    __tablename__ = "webmap_annotation"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    webmap_id: Mapped[int] = mapped_column(sa.ForeignKey(WebMap.id))
    description: Mapped[str | None] = mapped_column(sa.Unicode)
    style: Mapped[dict | None] = mapped_column(sa_pg.JSONB)
    geom: Mapped[saext.Geometry] = mapped_column(saext.Geometry("GEOMETRY", 3857))
    public: Mapped[bool] = mapped_column(sa.Boolean, default=True)
    user_id: Mapped[int | None] = mapped_column(sa.ForeignKey(User.id))

    webmap: Mapped[WebMap] = orm.relationship(back_populates="annotations")

    user: Mapped[User | None] = orm.relationship(
        backref=orm.backref(
            "webmap_annotations",
            cascade="all,delete-orphan",
        ),
    )

    @orm.validates("public", "user_id")
    def validates_read_only_fields(self, key, value):
        val = getattr(self, key)
        if val or val is False:
            raise ValueError("WebMapAnnotation.%s cannot be modified." % key)
        return value


def _children_from_model(obj):
    result: list[WebMapItemGroupRead | WebMapItemLayerRead] = []
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
    layer_style_id: int
    style_parent_id: int | None
    layer_adapter: str
    layer_enabled: bool
    layer_identifiable: bool
    layer_min_scale_denom: float | None
    layer_max_scale_denom: float | None
    legend_symbols: LegendSymbolsEnum | None
    layer_opacity: Annotated[float, Meta(ge=0, le=1)] | None
    draw_order_position: int | None

    layer_transparency: Annotated[float | None, DEPRECATED]

    @classmethod
    def from_model(cls, obj):
        style_parent_id = None
        if (style := obj.style) and (style_parent := style.parent):
            style_parent_id = style_parent.id

        return WebMapItemLayerRead(
            display_name=obj.display_name,
            layer_style_id=obj.layer_style_id,
            style_parent_id=style_parent_id,
            layer_adapter=obj.layer_adapter,
            layer_enabled=bool(obj.layer_enabled),
            layer_identifiable=bool(obj.layer_identifiable),
            layer_min_scale_denom=obj.layer_min_scale_denom,
            layer_max_scale_denom=obj.layer_max_scale_denom,
            legend_symbols=obj.legend_symbols,
            layer_opacity=obj.layer_opacity,
            draw_order_position=obj.draw_order_position,
            layer_transparency=obj.layer_transparency,
        )


class WebMapItemLayerWrite(Struct, kw_only=True, tag="layer", tag_field="item_type"):
    display_name: str
    layer_style_id: int
    layer_adapter: str
    layer_enabled: bool | UnsetType = UNSET
    layer_identifiable: bool | UnsetType = UNSET
    layer_min_scale_denom: float | None | UnsetType = UNSET
    layer_max_scale_denom: float | None | UnsetType = UNSET
    legend_symbols: LegendSymbolsEnum | None | UnsetType = UNSET
    layer_opacity: Annotated[float, Meta(ge=0, le=1)] | None | UnsetType = UNSET
    draw_order_position: int | None | UnsetType = UNSET
    layer_transparency: Annotated[float | None | UnsetType, DEPRECATED] = UNSET

    def to_model(self):
        kw = {k: v for k, v in struct_asdict(self).items() if v is not UNSET}
        layer_opacity = kw.pop("layer_opacity", UNSET)
        result = WebMapItem(item_type="layer", **kw)
        if layer_opacity is not UNSET:
            result.layer_opacity = layer_opacity
        return result


class WebMapItemGroupRead(Struct, kw_only=True, tag="group", tag_field="item_type"):
    display_name: str
    group_expanded: bool
    group_enabled: bool
    group_exclusive: bool
    children: "list[WebMapItemGroupRead | WebMapItemLayerRead]"

    @classmethod
    def from_model(cls, obj):
        return WebMapItemGroupRead(
            display_name=obj.display_name,
            group_expanded=bool(obj.group_expanded),
            group_enabled=bool(obj.group_enabled),
            group_exclusive=bool(obj.group_exclusive),
            children=_children_from_model(obj),
        )


class WebMapItemGroupWrite(Struct, kw_only=True, tag="group", tag_field="item_type"):
    display_name: str
    group_expanded: bool = False
    group_enabled: bool = True
    group_exclusive: bool = False
    children: "list[WebMapItemGroupWrite | WebMapItemLayerWrite]" = []

    def to_model(self):
        asdict = struct_asdict(self)
        children = [i.to_model() for i in asdict.pop("children")]
        result = WebMapItem(item_type="group", children=children, **asdict)

        enabled_seen = False
        if result.group_exclusive:
            for child in result.children:
                match child.item_type:
                    case "layer":
                        if child.layer_enabled:
                            if enabled_seen:
                                child.layer_enabled = False
                            else:
                                enabled_seen = True
                    case "group":
                        if child.group_enabled:
                            if enabled_seen:
                                child.group_enabled = False
                            else:
                                enabled_seen = True
                    case _:
                        raise NotImplementedError

        return result


class WebMapItemRootRead(Struct, kw_only=True):
    item_type: Literal["root"]
    children: "list[WebMapItemGroupRead | WebMapItemLayerRead]"

    @classmethod
    def from_model(cls, obj):
        return WebMapItemRootRead(
            item_type="root",
            children=_children_from_model(obj),
        )


class WebMapItemRootWrite(Struct, kw_only=True):
    item_type: Literal["root"] = "root"
    children: "list[WebMapItemGroupWrite | WebMapItemLayerWrite]" = []

    def to_model(self, obj):
        assert obj.item_type == self.item_type
        existing = list(obj.children)
        obj.children = [i.to_model() for i in self.children]
        for e in existing:
            DBSession.delete(e)


class RootItemAttr(SAttribute):
    def get(self, srlzr: Serializer) -> WebMapItemRootRead:
        return WebMapItemRootRead.from_model(srlzr.obj.root_item)

    def set(self, srlzr: Serializer, value: WebMapItemRootWrite, *, create: bool):
        value.to_model(srlzr.obj.root_item)


Lon = Annotated[float, Meta(ge=-180, le=180, description="Longitude")]
Lat = Annotated[float, Meta(ge=-90, le=90, description="Latitude")]


class ExtentPartAttr(SColumn):
    def setup_types(self):
        if self.attrname.endswith(("_left", "_right")):
            base = Lon
        elif self.attrname.endswith(("_bottom", "_top")):
            base = Lat
        else:
            raise NotImplementedError

        self.required = False
        self.types = CRUTypes(
            Annotated[None | base, DEPRECATED],
            Annotated[None | base, DEPRECATED],
            Annotated[None | base, DEPRECATED],
        )


class ExtentWSEN(Struct, array_like=True, forbid_unknown_fields=True):
    west: Annotated[Lon, Meta(title="West")]
    south: Annotated[Lat, Meta(title="South")]
    east: Annotated[Lon, Meta(title="East")]
    north: Annotated[Lat, Meta(title="North")]


class ExtentAttr(SAttribute):
    def bind(self, srlzrcls: Type[Serializer], attrname: str):
        super().bind(srlzrcls, attrname)
        if attrname == "initial_extent":
            self.attrs = tuple(f"extent_{i}" for i in ("left", "bottom", "right", "top"))
        elif attrname == "constraining_extent":
            self.attrs = tuple(f"extent_const_{i}" for i in ("left", "bottom", "right", "top"))
        else:
            raise NotImplementedError

    def get(self, srlzr: Serializer) -> ExtentWSEN | None:
        obj = srlzr.obj
        parts = [getattr(obj, a) for a in self.attrs]
        return ExtentWSEN(*parts) if None not in parts else None

    def set(self, srlzr: Serializer, value: ExtentWSEN | None, *, create: bool):
        obj = srlzr.obj
        if value is None:
            for a in self.attrs:
                setattr(obj, a, None)
        else:
            for a, b in zip(self.attrs, ("west", "south", "east", "north")):
                setattr(obj, a, getattr(value, b))


class OptionsAttr(SAttribute):
    def get(self, srlzr: Serializer) -> dict[str, bool]:
        return srlzr.obj.options

    def set(self, srlzr: Serializer, value: dict[str, bool], *, create: bool):
        for k in value.keys():
            if k not in WebMapOption.registry:
                raise ValidationError("Unknown web map option '{}'.".format(k))
        super().set(srlzr, value, create=create)


class WebMapSerializer(Serializer, resource=WebMap):
    initial_extent = ExtentAttr(read=ResourceScope.read, write=ResourceScope.update)
    constraining_extent = ExtentAttr(read=ResourceScope.read, write=ResourceScope.update)
    title = SColumn(read=ResourceScope.read, write=ResourceScope.update)

    draw_order_enabled = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    editable = SColumn(read=ResourceScope.read, write=ResourceScope.update)

    annotation_enabled = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    annotation_default = SColumn(read=ResourceScope.read, write=ResourceScope.update)

    legend_symbols = SColumn(read=ResourceScope.read, write=ResourceScope.update)

    measure_srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update)
    bookmark_resource = SResource(read=ResourceScope.read, write=ResourceScope.update)

    root_item = RootItemAttr(read=ResourceScope.read, write=ResourceScope.update)

    extent_left = ExtentPartAttr(read=ResourceScope.read, write=ResourceScope.update)
    extent_right = ExtentPartAttr(read=ResourceScope.read, write=ResourceScope.update)
    extent_bottom = ExtentPartAttr(read=ResourceScope.read, write=ResourceScope.update)
    extent_top = ExtentPartAttr(read=ResourceScope.read, write=ResourceScope.update)

    extent_const_left = ExtentPartAttr(read=ResourceScope.read, write=ResourceScope.update)
    extent_const_right = ExtentPartAttr(read=ResourceScope.read, write=ResourceScope.update)
    extent_const_bottom = ExtentPartAttr(read=ResourceScope.read, write=ResourceScope.update)
    extent_const_top = ExtentPartAttr(read=ResourceScope.read, write=ResourceScope.update)

    options = OptionsAttr(read=ResourceScope.read, write=ResourceScope.update)


@sa_event.listens_for(SRS, "after_delete")
def check_measurement_srid(mapper, connection, target):
    sql = "DELETE FROM setting WHERE component = :c AND name = :n AND value::text::int = :v"
    connection.execute(text(sql), dict(c=COMP_ID, n="measurement_srid", v=target.id))
