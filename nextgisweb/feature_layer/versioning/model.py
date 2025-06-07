from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime
from typing import Annotated, Any, List, Literal, TypeVar, Union

import sqlalchemy as sa
import sqlalchemy.event as sa_event
import sqlalchemy.orm as orm
from msgspec import UNSET, Meta, Struct, UnsetType
from msgspec.inspect import StructType, type_info
from sqlalchemy import inspect
from zope.interface import classImplements

from nextgisweb.env import Base, gettext

from nextgisweb.auth import OnFindReferencesData, Principal, User
from nextgisweb.resource import Resource

from ..interface import IVersionableFeatureLayer
from .exception import VersioningException

ActColValue = Union[Literal["C"], Literal["U"], Literal["D"]]


class FVersioningMixin:
    @orm.declared_attr
    def fversioning(cls):
        return orm.relationship(
            FVersioningMeta,
            uselist=False,
            cascade="all, delete-orphan",
        )

    @property
    def fversioning_vobj(self) -> Union[FVersioningObj, None]:
        if fversioning := self.fversioning:
            return fversioning.vobj
        return None

    def fversioning_configure(self, *, enabled=None, source=None):
        if enabled is not None and enabled != bool(self.fversioning):
            if enabled:
                # Assign new epoch from sequence
                session = inspect(self).session
                with session.no_autoflush:
                    sql = f"SELECT nextval('{VERSIONING_EPOCH_SEQ}')"
                    epoch = session.scalar(sa.text(sql))

                self.fversioning = vmeta = FVersioningMeta()
                vmeta.epoch = epoch

                # Initialize first version
                if self.fversioning_vobj is None:
                    self.fversioning_open(source)
            else:
                self.fversioning = None

    def fversioning_open(self, source=None, /, **kwargs):
        fversioning = self.fversioning
        assert fversioning and fversioning.vobj is None

        if source:
            for a in ("user",):
                if a not in kwargs and hasattr(source, a):
                    kwargs[a] = getattr(source, a)

        vnext = self.fversioning.next()
        vobj = FVersioningObj(self, vnext, **kwargs)

        self.fversioning.vobj = vobj
        if vobj.version_id == 1:
            vobj.mark_changed()

        return vobj

    def fversioning_close(self, *, raise_if_not_enabled=False):
        if fversioning := self.fversioning:
            assert fversioning.vobj is not None
            fversioning.vobj.close()
            fversioning.vobj = None
        elif raise_if_not_enabled:
            raise VersioningException

    @contextmanager
    def fversioning_context(self, source=None, /, **kwargs):
        try:
            yield self.fversioning_open(source, **kwargs)
        finally:
            # TODO: Discard it on exception?
            self.fversioning_close()

    def fversioning_info(self):
        return ((gettext("Feature versioning"), bool(self.fversioning)),)


classImplements(FVersioningMixin, IVersionableFeatureLayer)


class FVersioningMeta(Base):
    __tablename__ = "feature_layer_vmeta"

    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)
    epoch = sa.Column(sa.Integer, nullable=False)
    latest = sa.Column(sa.Integer, nullable=False)
    started = sa.Column(sa.DateTime, nullable=False)
    updated = sa.Column(sa.DateTime, nullable=False)

    __table_args__ = (
        sa.CheckConstraint(
            "(latest = 1 AND updated = started) OR (latest > 1 AND updated > started)"
        ),
    )

    vobj: Union[FVersioningObj, None] = None

    def next(self):
        insp = inspect(self)
        if insp.pending or self.latest is None:
            self.latest = 1
            return 1
        elif insp.pending or insp.attrs.latest.history.added:
            return self.latest + 1
        else:
            session = insp.session
            with session.no_autoflush:
                qlast = sa.select(FVersioningMeta.latest)
                assert self.resource_id
                qlast = qlast.filter_by(resource_id=self.resource_id).with_for_update()
                vnext = session.scalar(qlast)
                assert vnext >= self.latest
                orm.attributes.set_committed_value(self, "latest", vnext)
            return self.latest + 1


# Sequence for versioning epoch, piggyback on LayerField's table
VERSIONING_EPOCH_SEQ = "feature_layer_vmeta_epoch_seq"
sa_event.listen(
    FVersioningMeta.__table__,
    "after_create",
    sa.DDL(f"CREATE SEQUENCE {VERSIONING_EPOCH_SEQ}"),
    propagate=True,
)


class FVersioningObj(Base):
    __tablename__ = "feature_layer_vobj"

    resource_id = sa.Column(sa.Integer, primary_key=True)
    version_id = sa.Column(sa.Integer, primary_key=True)
    tstamp = sa.Column(sa.DateTime, nullable=False)
    user_id = sa.Column(sa.ForeignKey(User.principal_id), nullable=True)

    resource = orm.relationship(Resource)
    vmeta = orm.relationship(FVersioningMeta, overlaps="resource")
    user = orm.relationship(User)

    __table_args__ = (
        sa.ForeignKeyConstraint(
            ["resource_id"],
            [Resource.id],
            ondelete="CASCADE",
            name=__tablename__ + "_resource_id__resource_fkey",
        ),
        sa.ForeignKeyConstraint(
            ["resource_id"],
            [FVersioningMeta.resource_id],
            ondelete="CASCADE",
            name=__tablename__ + "_resource_id__vmeta_fkey",
        ),
    )

    has_changes: bool = False
    unflushed_changes: bool = False
    features_deleted: List[int]
    features_restored: List[int]
    features_truncated: bool

    def __init__(self, resource, version_id, /, user=None) -> None:
        assert resource and version_id

        self.resource = resource
        self.version_id = version_id
        self.tstamp = datetime.utcnow()
        self.user = user

        self.is_open = True
        self.features_deleted = list()
        self.features_restored = list()
        self.features_truncated = False

    def mark_changed(self):
        assert self.is_open

        if not self.unflushed_changes:
            orm.attributes.flag_dirty(self)
            self.unflushed = True

        if self.has_changes:
            return

        fversioning = self.resource.fversioning
        fversioning.latest = self.version_id
        fversioning.updated = self.tstamp
        if self.version_id == 1:
            fversioning.started = self.tstamp

        inspect(self.resource).session.add(self)
        self.has_changes = True

    def mark_features_deleted(self, *fid, all=False):
        self.mark_changed()
        if all:
            self.features_truncated = True
        else:
            self.features_deleted.extend(fid)

    def mark_features_restored(self, *fid):
        self.mark_changed()
        self.features_restored.extend(fid)

    def close(self):
        assert self.is_open
        self.is_open = False


FieldID = Annotated[int, Meta(title="FieldID")]
FeatureID = Annotated[int, Meta(title="FeatureID")]
VersionID = Annotated[int, Meta(title="VersionID")]

registry = list()
S = TypeVar("S")


def register_change(cls: S) -> S:
    global registry
    registry.append(cls)
    return cls


def auto_description(cls: S) -> S:
    tinfo = type_info(cls)
    assert isinstance(tinfo, StructType) and isinstance(tinfo.tag, str)
    fscope, operation = tinfo.tag.split(".")

    description = None
    if operation == "create":
        description = (
            "The {0} has been created between the initial and the target "
            "versions and not deleted in the same version range. Each {0} can "
            "be created only once, and if it was created, deleted and "
            "restored, it will be reported using the 'restore' operation. All "
            "operations are squashed into one, and the version ID corresponds "
            "to the last one."
        )
    elif operation == "update":
        description = (
            "The {0} exists in both the initial and target versions and has "
            "been updated. In case of multiple consequent operations, the "
            "version ID corresponds to the last one."
        )
    elif operation == "delete":
        description = (
            "The {0} exists in the initial version and does not exist in the "
            "target version, thus it has been deleted."
        )
        if fscope != "feature":
            description += "\n\n" + (
                "This could also be a cascade deletion of child feature {0}s. "
                "In this case, it may follow or precede the feature removal "
                "itself in the results, so the order of changes is unspecified."
            )

    elif operation == "restore":
        description = (
            "The {0} was deleted in the initial version, and it has been "
            "restored at between the initial and the target versions."
        )

    if description:
        cls.__doc__ = description.format(fscope)

    return cls


class OperationFieldValue(Struct, array_like=True, forbid_unknown_fields=True):
    id: FieldID
    val: Annotated[Any, Meta(title="Value")]


Geom = Annotated[
    Union[bytes, None],
    Meta(
        description="WKB-encoded geometry or NULL if feature geometry was "
        "modified during update or specified during creation. NULL geometries "
        "are ommited in case of feature creation."
    ),
]
Fields = Annotated[
    List[OperationFieldValue],
    Meta(
        description="Field values updated or specified during creation. NULL "
        "field values are ommited in case of feature creation.",
    ),
]


@register_change
@auto_description
class FeatureCreate(Struct, kw_only=True, tag="feature.create", tag_field="action"):
    fid: FeatureID
    vid: VersionID
    geom: Union[Geom, UnsetType] = UNSET
    fields: Union[Fields, UnsetType] = UNSET


@register_change
@auto_description
class FeatureUpdate(Struct, kw_only=True, tag="feature.update", tag_field="action"):
    fid: FeatureID
    vid: VersionID
    geom: Union[Geom, UnsetType] = UNSET
    fields: Union[Fields, UnsetType] = UNSET


@register_change
@auto_description
class FeatureDelete(Struct, kw_only=True, tag="feature.delete", tag_field="action"):
    fid: FeatureID
    vid: VersionID


@register_change
@auto_description
class FeatureRestore(Struct, kw_only=True, tag="feature.restore", tag_field="action"):
    fid: FeatureID
    vid: VersionID
    geom: Union[Geom, UnsetType] = UNSET
    fields: Union[Fields, UnsetType] = UNSET


@Principal.on_find_references.handler
def _on_find_references(event):
    principal = event.principal
    data = event.data

    if isinstance(principal, User):
        for vobj in FVersioningObj.filter_by(user_id=principal.id):
            data.append(
                OnFindReferencesData(
                    cls=vobj.resource.cls,
                    id=vobj.resource_id,
                    autoremove=False,
                )
            )
