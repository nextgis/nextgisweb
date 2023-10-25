from nextgisweb.env import Base, _
from nextgisweb.lib import db

from nextgisweb.resource import Resource, ResourceGroup, Serializer, ServiceScope
from nextgisweb.resource import SerializedProperty as SP

Base.depends_on("resource", "feature_layer")


class Service(Base, Resource):
    identity = "ogcfserver_service"
    cls_display_name = _("OGC API Features service")

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

    def to_dict(self):
        return dict(
            keyname=self.keyname,
            display_name=self.display_name,
            maxfeatures=self.maxfeatures,
            resource_id=self.resource_id,
        )


class _collections_attr(SP):
    def getter(self, srlzr):
        return [collection.to_dict() for collection in srlzr.obj.collections]

    def setter(self, srlzr, value):
        m = dict((collection.resource_id, collection) for collection in srlzr.obj.collections)
        keep = set()
        for lv in value:
            if lv["resource_id"] in m:
                lo = m[lv["resource_id"]]
                keep.add(lv["resource_id"])
            else:
                lo = Collection(resource_id=lv["resource_id"])
                srlzr.obj.collections.append(lo)

            for a in ("keyname", "display_name", "maxfeatures"):
                setattr(lo, a, lv[a])

        for lrid, lo in m.items():
            if lrid not in keep:
                srlzr.obj.collections.remove(lo)


class ServiceSerializer(Serializer):
    identity = Service.identity
    resclass = Service

    collections = _collections_attr(read=ServiceScope.connect, write=ServiceScope.configure)
