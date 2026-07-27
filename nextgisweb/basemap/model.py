from typing import Annotated, Any

import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import UNSET, Meta, Struct, UnsetType, to_builtins
from sqlalchemy.ext.orderinglist import ordering_list
from sqlalchemy.orm import Mapped, mapped_column

from nextgisweb.env import Base, gettext

from nextgisweb.resource import (
    CRUTypes,
    DataScope,
    Resource,
    ResourceGroup,
    ResourceScope,
    SAttribute,
    SColumn,
    Serializer,
)
from nextgisweb.webmap import WebMap


class BasemapLayer(Resource):
    identity = "basemap_layer"
    cls_display_name = gettext("Basemap")

    __scope__ = DataScope

    url = sa.Column(sa.Unicode, nullable=False)
    qms = sa.Column(sa.Unicode)
    copyright_text = sa.Column(sa.Unicode)
    copyright_url = sa.Column(sa.Unicode)
    z_min = sa.Column(sa.Integer)
    z_max = sa.Column(sa.Integer)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)


class BasemapLayerSerializer(Serializer, resource=BasemapLayer):
    url = SColumn(read=DataScope.read, write=DataScope.write)
    qms = SColumn(read=DataScope.read, write=DataScope.write)
    copyright_text = SColumn(read=DataScope.read, write=DataScope.write)
    copyright_url = SColumn(read=DataScope.read, write=DataScope.write)
    z_min = SColumn(read=DataScope.read, write=DataScope.write)
    z_max = SColumn(read=DataScope.read, write=DataScope.write)


class BasemapWebMap(Base):
    __tablename__ = "basemap_webmap"

    webmap_id = sa.Column(sa.ForeignKey(WebMap.id), primary_key=True)
    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)
    position = sa.Column(sa.Integer)
    display_name = sa.Column(sa.Unicode, nullable=False)
    enabled = sa.Column(sa.Boolean)
    opacity = sa.Column(sa.Float)

    webmap = orm.relationship(
        WebMap,
        foreign_keys=webmap_id,
        backref=orm.backref(
            "basemaps",
            cascade="all, delete-orphan",
            order_by=position,
            collection_class=ordering_list("position"),
        ),
    )

    resource = orm.relationship(
        Resource,
        foreign_keys=resource_id,
        backref=orm.backref(
            "_backref_basemap_webmap",
            cascade="all",
            cascade_backrefs=False,
        ),
    )

    def to_dict(self):
        return dict(
            resource_id=self.resource_id,
            position=self.position,
            display_name=self.display_name,
            enabled=self.enabled,
            opacity=self.opacity,
        )


class BasemapWebMapConfig(Base):
    __tablename__ = "basemap_webmap_config"

    webmap_id: Mapped[int] = mapped_column(sa.ForeignKey(WebMap.id), primary_key=True)
    background_color: Mapped[str | None] = mapped_column(sa.Unicode(6))
    disable: Mapped[bool] = mapped_column(default=False)

    webmap = orm.relationship(
        WebMap,
        backref=orm.backref(
            "basemap_config",
            cascade="all, delete-orphan",
            uselist=False,
        ),
    )


OpacityFloat = Annotated[float, Meta(gt=0, le=1)]


class BasemapWebMapItemRead(Struct, kw_only=True):
    resource_id: int
    display_name: Annotated[str, Meta(min_length=1)]
    enabled: bool
    opacity: OpacityFloat | None


class BasemapWebMapItemWrite(Struct, kw_only=True):
    resource_id: int
    display_name: Annotated[str, Meta(min_length=1)]
    enabled: bool | UnsetType = UNSET
    opacity: OpacityFloat | None | UnsetType = UNSET


class BasemapsAttr(SAttribute):
    def get(self, srlzr: Serializer) -> list[BasemapWebMapItemRead]:
        return [
            BasemapWebMapItemRead(
                resource_id=i.resource_id,
                display_name=i.display_name,
                enabled=i.enabled,
                opacity=i.opacity,
            )
            for i in srlzr.obj.basemaps
        ]

    def set(self, srlzr: Serializer, value: list[BasemapWebMapItemWrite], *, create: bool):
        srlzr.obj.basemaps = [BasemapWebMap(**to_builtins(i)) for i in value]


BackgroundColor = Annotated[str, Meta(pattern=r"^[0-9a-f]{6}$")]


class BasemapWebMapConfigAttr(SAttribute):
    def bind(self, srlzrcls, attrname):
        column = getattr(BasemapWebMapConfig, attrname)
        self.default = column.default.arg if column.default is not None else None
        super().bind(srlzrcls, attrname)

    def get(self, srlzr: Serializer) -> Any:
        config = srlzr.obj.basemap_config
        if config is None:
            return self.default
        return getattr(config, self.model_attr)

    def set(self, srlzr: Serializer, value: Any, *, create: bool):
        if value != self.default or srlzr.obj.basemap_config is not None:
            config = srlzr.obj.basemap_config
            if config is None:
                config = srlzr.obj.basemap_config = BasemapWebMapConfig()
            setattr(config, self.model_attr, value)


class BackgroundColorAttr(BasemapWebMapConfigAttr):
    ctypes = CRUTypes(BackgroundColor | None, BackgroundColor | None, BackgroundColor | None)


class DisableAttr(BasemapWebMapConfigAttr):
    ctypes = CRUTypes(bool, bool, bool)


class BasemapWebMapSerializer(Serializer, resource=WebMap):
    identity = BasemapWebMap.__tablename__

    basemaps = BasemapsAttr(read=ResourceScope.read, write=ResourceScope.update)
    background_color = BackgroundColorAttr(read=ResourceScope.read, write=ResourceScope.update)
    disable = DisableAttr(read=ResourceScope.read, write=ResourceScope.update)
