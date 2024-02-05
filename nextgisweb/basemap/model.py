from sqlalchemy.ext.orderinglist import ordering_list

from nextgisweb.env import Base, _
from nextgisweb.lib import db

from nextgisweb.resource import (
    DataScope,
    Resource,
    ResourceGroup,
    ResourceScope,
    Serializer,
)
from nextgisweb.resource import SerializedProperty as SP
from nextgisweb.webmap import WebMap


class BasemapLayer(Base, Resource):
    identity = "basemap_layer"
    cls_display_name = _("Basemap")

    __scope__ = DataScope

    url = db.Column(db.Unicode, nullable=False)
    qms = db.Column(db.Unicode)
    copyright_text = db.Column(db.Unicode)
    copyright_url = db.Column(db.Unicode)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)


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


class BasemapLayerSerializer(Serializer):
    identity = BasemapLayer.identity
    resclass = BasemapLayer

    url = SP(read=DataScope.read, write=DataScope.write)
    qms = SP(read=DataScope.read, write=DataScope.write)
    copyright_text = SP(read=DataScope.read, write=DataScope.write)
    copyright_url = SP(read=DataScope.read, write=DataScope.write)


class _basemaps_attr(SP):
    def getter(self, srlzr):
        return sorted(
            [bm.to_dict() for bm in srlzr.obj.basemaps],
            key=lambda bm: bm["position"],
        )

    def setter(self, srlzr, value):
        srlzr.obj.basemaps = []

        for bm in value:
            bmo = BasemapWebMap(resource_id=bm["resource_id"])
            srlzr.obj.basemaps.append(bmo)

            for a in ("display_name", "enabled", "opacity"):
                setattr(bmo, a, bm[a])


class BasemapWebMapSerializer(Serializer):
    identity = BasemapWebMap.__tablename__
    resclass = WebMap

    basemaps = _basemaps_attr(read=ResourceScope.read, write=ResourceScope.update)
