from typing import Any

import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import UNSET, Struct, UnsetType
from osgeo import ogr
from sqlalchemy.ext.orderinglist import ordering_list
from sqlalchemy.orm import declared_attr

from nextgisweb.env import Base, env, gettext
from nextgisweb.lib import saext
from nextgisweb.lib.geometry import Transformer

from nextgisweb.core.exception import ValidationError
from nextgisweb.lookup_table import LookupTable
from nextgisweb.resource import Resource, ResourceScope, SAttribute, Serializer
from nextgisweb.resource.model import ResourceRef
from nextgisweb.spatial_ref_sys import SRS

from .interface import (
    FIELD_TYPE,
    FIELD_TYPE_OGR,
    FeatureLayerFieldDatatype,
    IVersionableFeatureLayer,
)

Base.depends_on("resource", "lookup_table")

_FIELD_TYPE_2_ENUM_REVERSED = dict(zip(FIELD_TYPE.enum, FIELD_TYPE_OGR))


class LayerField(Base):
    __tablename__ = "layer_field"

    id = sa.Column(sa.Integer, primary_key=True)
    layer_id = sa.Column(sa.ForeignKey(Resource.id), nullable=False)
    cls = sa.Column(sa.Unicode, nullable=False)

    idx = sa.Column(sa.Integer, nullable=False)
    keyname = sa.Column(sa.Unicode, nullable=False)
    datatype = sa.Column(saext.Enum(*FIELD_TYPE.enum), nullable=False)
    display_name = sa.Column(sa.Unicode, nullable=False)
    grid_visibility = sa.Column(sa.Boolean, nullable=False, default=True)
    text_search = sa.Column(sa.Boolean, nullable=False, default=True)
    lookup_table_id = sa.Column(sa.ForeignKey(LookupTable.id))

    identity = __tablename__

    __mapper_args__ = {"polymorphic_identity": identity, "polymorphic_on": cls}
    __table_args__ = (
        sa.UniqueConstraint(layer_id, keyname, deferrable=True, initially="DEFERRED"),
        sa.UniqueConstraint(layer_id, display_name, deferrable=True, initially="DEFERRED"),
    )

    layer = orm.relationship(Resource, primaryjoin="Resource.id == LayerField.layer_id")

    lookup_table = orm.relationship(
        LookupTable,
        primaryjoin="LayerField.lookup_table_id == LookupTable.id",
        backref=orm.backref("layer_fields", cascade_backrefs=False),
    )

    def __str__(self):
        return self.display_name


class LayerFieldsMixin:
    __field_class__ = LayerField

    @declared_attr
    def fields(cls):
        return orm.relationship(
            cls.__field_class__,
            foreign_keys=cls.__field_class__.layer_id,
            order_by=cls.__field_class__.idx,
            collection_class=ordering_list("idx"),
            cascade="all, delete-orphan",
            back_populates="layer",
            single_parent=True,
        )

    @declared_attr
    def feature_label_field_id(cls):
        return sa.Column("feature_label_field_id", sa.ForeignKey(cls.__field_class__.id))

    @declared_attr
    def feature_label_field(cls):
        return orm.relationship(
            cls.__field_class__,
            uselist=False,
            primaryjoin="%s.id == %s.feature_label_field_id"
            % (cls.__field_class__.__name__, cls.__name__),
            cascade="all",
            post_update=True,
            backref=orm.backref("_feature_label_field_backref"),
        )

    def to_ogr(self, ogr_ds, *, name="", fields=None, aliases=None, fid=None):
        if fields is None:
            fields = self.fields
        sr = self.srs.to_osr()
        ogr_layer = ogr_ds.CreateLayer(name, srs=sr)
        for field in fields:
            ogr_layer.CreateField(
                ogr.FieldDefn(
                    aliases[field.keyname] if aliases is not None else field.keyname,
                    _FIELD_TYPE_2_ENUM_REVERSED[field.datatype],
                )
            )
        if fid is not None:
            ogr_layer.CreateField(ogr.FieldDefn(fid, ogr.OFTInteger))
        return ogr_layer


class FeatureLayerFieldRead(Struct, kw_only=True):
    id: int
    keyname: str
    display_name: str
    datatype: FeatureLayerFieldDatatype
    typemod: Any
    label_field: bool
    grid_visibility: bool
    text_search: bool
    lookup_table: ResourceRef | None


class FeatureLayerFieldWrite(Struct, kw_only=True):
    id: int | UnsetType = UNSET
    delete: bool | UnsetType = UNSET
    keyname: str | UnsetType = UNSET
    display_name: str | UnsetType = UNSET
    datatype: FeatureLayerFieldDatatype | UnsetType = UNSET
    typemod: Any | UnsetType = UNSET
    label_field: bool | UnsetType = UNSET
    grid_visibility: bool | UnsetType = UNSET
    text_search: bool | UnsetType = UNSET
    lookup_table: ResourceRef | None | UnsetType = UNSET


class FieldsAttr(SAttribute):
    def get(self, srlzr: Serializer) -> list[FeatureLayerFieldRead]:
        return [
            FeatureLayerFieldRead(
                id=f.id,
                keyname=f.keyname,
                display_name=f.display_name,
                datatype=f.datatype,
                typemod=None,
                label_field=(f == srlzr.obj.feature_label_field),
                grid_visibility=f.grid_visibility,
                text_search=f.text_search,
                lookup_table=ResourceRef(id=f.lookup_table.id) if f.lookup_table else None,
            )
            for f in srlzr.obj.fields
        ]

    def set(self, srlzr: Serializer, value: list[FeatureLayerFieldWrite], *, create: bool):
        obj = srlzr.obj

        fldmap = dict()
        for fld in obj.fields:
            fldmap[fld.id] = fld

        obj.feature_label_field = None

        new_fields = list()
        for fld in value:
            if (fldid := fld.id) is not UNSET:
                try:
                    mfld = fldmap.pop(fldid)
                except KeyError:
                    raise ValidationError(gettext("Field not found (ID=%d)." % fldid))

                if fld.delete is True:
                    obj.field_delete(mfld)
                    continue
            else:
                mfld = obj.field_create(fld.datatype)

            if fld.keyname is not UNSET:
                mfld.keyname = fld.keyname

            if fld.display_name is not UNSET:
                mfld.display_name = fld.display_name

            if fld.grid_visibility is not UNSET:
                mfld.grid_visibility = fld.grid_visibility

            if fld.text_search is not UNSET:
                mfld.text_search = fld.text_search

            if fld.lookup_table is None:
                mfld.lookup_table = fld.lookup_table
            elif fld.lookup_table is not UNSET:
                # TODO: Handle errors: wrong schema, missing lookup table
                mfld.lookup_table = LookupTable.filter_by(id=fld.lookup_table.id).one()

            if fld.label_field is True:
                obj.feature_label_field = mfld

            new_fields.append(mfld)

        # Keep not mentioned fields
        fields = list(fldmap.values())
        fields.extend(new_fields)

        # Check unique names
        fields_len = len(fields)
        for i in range(fields_len):
            keyname = fields[i].keyname
            display_name = fields[i].display_name
            for j in range(i + 1, fields_len):
                if keyname == fields[j].keyname:
                    raise ValidationError("Field keyname (%s) is not unique." % keyname)
                if display_name == fields[j].display_name:
                    raise ValidationError(
                        message="Field display_name (%s) is not unique." % display_name
                    )

        obj.fields = fields
        obj.fields.reorder()


class FVersioningRead(Struct, kw_only=True):
    enabled: bool
    epoch: int | UnsetType
    latest: int | UnsetType


class FVersioningUpdate(Struct, kw_only=True):
    enabled: bool | UnsetType = UNSET


class FVersioningAttr(SAttribute):
    def get(self, srlzr: Serializer) -> FVersioningRead | None:
        obj = srlzr.obj
        if not IVersionableFeatureLayer.providedBy(obj):
            return None

        fversioning = obj.fversioning
        enabled = bool(fversioning)
        epoch = fversioning.epoch if enabled else UNSET
        latest = fversioning.latest if enabled else UNSET
        return FVersioningRead(enabled=enabled, epoch=epoch, latest=latest)

    def set(self, srlzr: Serializer, value: FVersioningUpdate, *, create: bool):
        obj = srlzr.obj
        if not IVersionableFeatureLayer.providedBy(obj):
            raise ValidationError(message=gettext("Versioning not supported"))

        if value.enabled is not None:
            if value.enabled != bool(obj.fversioning):
                obj.fversioning_configure(enabled=value.enabled, source=srlzr)


class FeatureLayerSerializer(Serializer, resource=LayerFieldsMixin, force_create=True):
    identity = "feature_layer"

    fields = FieldsAttr(read=ResourceScope.read, write=ResourceScope.update)
    versioning = FVersioningAttr(read=ResourceScope.read, write=ResourceScope.update)

    def deserialize(self):
        if self.obj.id is None and IVersionableFeatureLayer.providedBy(self.obj):
            fv = self.data.versioning
            if fv is UNSET:
                fv = self.data.versioning = FVersioningUpdate()
            if fv.enabled is UNSET:
                fv.enabled = env.feature_layer.versioning_default

        super().deserialize()


class FeatureQueryIntersectsMixin:
    def __init__(self):
        self._intersects = None

    def intersects(self, geom):
        reproject = geom.srid is not None and geom.srid not in self.srs_supported

        if reproject:
            srs_from = SRS.filter_by(id=geom.srid).one()
            transformer = Transformer(srs_from.wkt, self.layer.srs.wkt)
            geom = transformer.transform(geom)

        self._intersects = geom
