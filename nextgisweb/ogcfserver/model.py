from typing import List, Union

from msgspec import Meta, Struct
from typing_extensions import Annotated

from nextgisweb.env import Base, gettext
from nextgisweb.lib import db

from nextgisweb.resource import Resource, ResourceGroup, SAttribute, Serializer, ServiceScope

Base.depends_on("resource", "feature_layer")


class Service(Base, Resource):
    identity = "ogcfserver_service"
    cls_display_name = gettext("OGC API Features service")

    __scope__ = ServiceScope

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)


class Collection(Base):
    __tablename__ = "ogcfserver_collection"

    service_id = db.Column(db.ForeignKey("ogcfserver_service.id"), primary_key=True)
    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    keyname = db.Column(db.Unicode, nullable=False)
    display_name = db.Column(db.Unicode, nullable=False)
    maxfeatures = db.Column(db.Integer, nullable=True)

    __table_args__ = (db.UniqueConstraint(service_id, keyname),)

    service = db.relationship(
        Service,
        foreign_keys=service_id,
        backref=db.backref("collections", cascade="all, delete-orphan"),
    )

    resource = db.relationship(
        Resource,
        foreign_keys=resource_id,
        backref=db.backref("_ogcfserver_collections", cascade="all"),
    )


class OGCFServerCollection(Struct, kw_only=True):
    resource_id: int
    keyname: Annotated[str, Meta(min_length=1)]
    display_name: Annotated[str, Meta(min_length=1)]
    maxfeatures: Union[Annotated[int, Meta(ge=1)], None]


class CollectionsAttr(SAttribute, apitype=True):
    def get(self, srlzr) -> List[OGCFServerCollection]:
        return [
            OGCFServerCollection(
                resource_id=layer.resource_id,
                keyname=layer.keyname,
                display_name=layer.display_name,
                maxfeatures=layer.maxfeatures,
            )
            for layer in srlzr.obj.collections
        ]

    def set(self, srlzr, value: List[OGCFServerCollection], *, create: bool):
        m = dict((layer.resource_id, layer) for layer in srlzr.obj.collections)
        keep = set()
        for cv in value:
            if cv.resource_id in m:
                co = m[cv.resource_id]
                keep.add(cv.resource_id)
            else:
                co = Collection(resource_id=cv.resource_id)
                srlzr.obj.collections.append(co)

            for a in ("keyname", "display_name", "maxfeatures"):
                setattr(co, a, getattr(cv, a))

        for lrid, co in m.items():
            if lrid not in keep:
                srlzr.obj.collections.remove(co)


class ServiceSerializer(Serializer, apitype=True):
    identity = Service.identity
    resclass = Service

    collections = CollectionsAttr(read=ServiceScope.connect, write=ServiceScope.configure)
