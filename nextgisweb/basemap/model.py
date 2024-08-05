from typing import List, Union

from msgspec import UNSET, Meta, Struct, UnsetType, to_builtins
from sqlalchemy.ext.orderinglist import ordering_list
from typing_extensions import Annotated

from nextgisweb.env import Base, gettext
from nextgisweb.lib import db

from nextgisweb.resource import (
    DataScope,
    Resource,
    ResourceGroup,
    ResourceScope,
    SAttribute,
    SColumn,
    Serializer,
)
from nextgisweb.webmap import WebMap


class BasemapLayer(Base, Resource):
    identity = "basemap_layer"
    cls_display_name = gettext("Basemap")

    __scope__ = DataScope

    url = db.Column(db.Unicode, nullable=False)
    qms = db.Column(db.Unicode)
    copyright_text = db.Column(db.Unicode)
    copyright_url = db.Column(db.Unicode)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)


class BasemapLayerSerializer(Serializer, resource=BasemapLayer):
    url = SColumn(read=DataScope.read, write=DataScope.write)
    qms = SColumn(read=DataScope.read, write=DataScope.write)
    copyright_text = SColumn(read=DataScope.read, write=DataScope.write)
    copyright_url = SColumn(read=DataScope.read, write=DataScope.write)


class BasemapWebMap(Base):
    __tablename__ = "basemap_webmap"

    webmap_id = db.Column(db.ForeignKey(WebMap.id), primary_key=True)
    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    position = db.Column(db.Integer)
    display_name = db.Column(db.Unicode, nullable=False)
    enabled = db.Column(db.Boolean)
    opacity = db.Column(db.Float)

    webmap = db.relationship(
        WebMap,
        foreign_keys=webmap_id,
        backref=db.backref(
            "basemaps",
            cascade="all, delete-orphan",
            order_by=position,
            collection_class=ordering_list("position"),
        ),
    )

    resource = db.relationship(
        Resource,
        foreign_keys=resource_id,
        backref=db.backref(
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


OpacityFloat = Annotated[float, Meta(gt=0, le=1)]


class BasemapWebMapItemRead(Struct, kw_only=True):
    resource_id: int
    display_name: Annotated[str, Meta(min_length=1)]
    enabled: bool
    opacity: Union[OpacityFloat, None]


class BasemapWebMapItemWrite(Struct, kw_only=True):
    resource_id: int
    display_name: Annotated[str, Meta(min_length=1)]
    enabled: Union[bool, UnsetType] = UNSET
    opacity: Union[OpacityFloat, None, UnsetType] = UNSET


class BasemapsAttr(SAttribute, apitype=True):
    def get(self, srlzr: Serializer) -> List[BasemapWebMapItemRead]:
        return [
            BasemapWebMapItemRead(
                resource_id=i.resource_id,
                display_name=i.display_name,
                enabled=i.enabled,
                opacity=i.opacity,
            )
            for i in srlzr.obj.basemaps
        ]

    def set(self, srlzr: Serializer, value: List[BasemapWebMapItemWrite], *, create: bool):
        srlzr.obj.basemaps = [BasemapWebMap(**to_builtins(i)) for i in value]


class BasemapWebMapSerializer(Serializer, apitype=True):
    identity = BasemapWebMap.__tablename__
    resclass = WebMap

    basemaps = BasemapsAttr(read=ResourceScope.read, write=ResourceScope.update)
