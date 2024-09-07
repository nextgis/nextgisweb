import re
from typing import List, Union

import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import Meta, Struct
from typing_extensions import Annotated

from nextgisweb.env import Base, gettext

from nextgisweb.core.exception import ValidationError
from nextgisweb.resource import Resource, ResourceGroup, SAttribute, Serializer, ServiceScope

Base.depends_on("resource", "feature_layer")

KEYNAME_RE = re.compile(r"^[A-Za-z][\w]*$")


class Service(Base, Resource):
    identity = "wfsserver_service"
    cls_display_name = gettext("WFS service")

    __scope__ = ServiceScope

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)


class Layer(Base):
    __tablename__ = "wfsserver_layer"

    service_id = sa.Column(sa.ForeignKey("wfsserver_service.id"), primary_key=True)
    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)
    keyname = sa.Column(sa.Unicode, nullable=False)
    display_name = sa.Column(sa.Unicode, nullable=False)
    maxfeatures = sa.Column(sa.Integer, nullable=True)

    __table_args__ = (sa.UniqueConstraint(service_id, keyname),)

    service = orm.relationship(
        Service,
        foreign_keys=service_id,
        backref=orm.backref("layers", cascade="all, delete-orphan"),
    )

    resource = orm.relationship(
        Resource,
        foreign_keys=resource_id,
        backref=orm.backref(
            "_wfsserver_layers",
            cascade="all",
            cascade_backrefs=False,
        ),
    )

    @orm.validates("keyname")
    def _validate_keyname(self, key, value):
        if not KEYNAME_RE.match(value):
            raise ValidationError("Invalid keyname: %s" % value)

        return value


class WFSServerLayer(Struct, kw_only=True):
    resource_id: int
    keyname: Annotated[str, Meta(pattern=KEYNAME_RE.pattern)]
    display_name: Annotated[str, Meta(min_length=1)]
    maxfeatures: Union[Annotated[int, Meta(ge=1)], None]


class LayersAttr(SAttribute, apitype=True):
    def get(self, srlzr) -> List[WFSServerLayer]:
        return [
            WFSServerLayer(
                resource_id=layer.resource_id,
                keyname=layer.keyname,
                display_name=layer.display_name,
                maxfeatures=layer.maxfeatures,
            )
            for layer in srlzr.obj.layers
        ]

    def set(self, srlzr, value: List[WFSServerLayer], *, create: bool):
        m = dict((layer.resource_id, layer) for layer in srlzr.obj.layers)
        keep = set()
        for lv in value:
            if lv.resource_id in m:
                lo = m[lv.resource_id]
                keep.add(lv.resource_id)
            else:
                lo = Layer(resource_id=lv.resource_id)
                srlzr.obj.layers.append(lo)

            for a in ("keyname", "display_name", "maxfeatures"):
                setattr(lo, a, getattr(lv, a))

        for lrid, lo in m.items():
            if lrid not in keep:
                srlzr.obj.layers.remove(lo)


class ServiceSerializer(Serializer, resource=Service):
    layers = LayersAttr(read=ServiceScope.connect, write=ServiceScope.configure)
