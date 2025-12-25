import re
from typing import Annotated

import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import Meta, Struct, to_builtins
from sqlalchemy.ext.orderinglist import ordering_list

from nextgisweb.env import Base, gettext

from nextgisweb.resource import Resource, ResourceGroup, SAttribute, Serializer, ServiceScope

Base.depends_on("resource")

KEYNAME_RE = re.compile(r"^[A-Za-z][\w]*$")


class Service(Base, Resource):
    identity = "wmsserver_service"
    cls_display_name = gettext("WMS service")

    __scope__ = ServiceScope

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)


class Layer(Base):
    __tablename__ = "wmsserver_layer"

    service_id = sa.Column(sa.ForeignKey("wmsserver_service.id"), primary_key=True)
    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)
    keyname = sa.Column(sa.Unicode, nullable=False)
    display_name = sa.Column(sa.Unicode, nullable=False)
    min_scale_denom = sa.Column(sa.Float, nullable=True)
    max_scale_denom = sa.Column(sa.Float, nullable=True)
    position = sa.Column(sa.Integer, nullable=True)

    service = orm.relationship(
        Service,
        foreign_keys=service_id,
        backref=orm.backref(
            "layers",
            cascade="all, delete-orphan",
            order_by=position,
            collection_class=ordering_list("position"),
        ),
    )

    resource = orm.relationship(
        Resource,
        foreign_keys=resource_id,
        backref=orm.backref("_wmsserver_layers", cascade="all"),
    )

    def scale_range(self):
        return (self.min_scale_denom, self.max_scale_denom)

    @property
    def is_queryable(self):
        return hasattr(self.resource, "feature_layer")


class WMSServiceLayer(Struct, kw_only=True):
    resource_id: int
    keyname: Annotated[str, Meta(pattern=KEYNAME_RE.pattern)]
    display_name: Annotated[str, Meta(min_length=1)]
    min_scale_denom: float | None
    max_scale_denom: float | None


class LayersAttr(SAttribute):
    def get(self, srlzr) -> list[WMSServiceLayer]:
        return [
            WMSServiceLayer(
                resource_id=layer.resource_id,
                keyname=layer.keyname,
                display_name=layer.display_name,
                min_scale_denom=layer.min_scale_denom,
                max_scale_denom=layer.max_scale_denom,
            )
            for layer in srlzr.obj.layers
        ]

    def set(self, srlzr, value: list[WMSServiceLayer], *, create: bool):
        srlzr.obj.layers = [Layer(**to_builtins(obj)) for obj in value]


class ServiceSerializer(Serializer, resource=Service):
    layers = LayersAttr(read=ServiceScope.connect, write=ServiceScope.configure, required=True)
