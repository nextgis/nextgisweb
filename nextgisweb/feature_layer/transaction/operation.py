import abc
import dataclasses as dc
from functools import cached_property
from typing import Annotated, Any, ClassVar, Literal, Type, TypeVar

from msgspec import UNSET, Meta, Struct, UnsetType
from msgspec.inspect import StructType, type_info

from nextgisweb.lib.geometry import Geometry

from ..feature import Feature
from ..transaction import FeatureLayerTransaction
from ..versioning import FVersioningMeta

SeqNum = Annotated[
    int,
    Meta(title="SeqNum", ge=0, le=2147483647),
    Meta(description="Operation sequential number"),
]

FeatureID = int

FeatureIDExisting = Annotated[
    FeatureID,
    Meta(description="ID of an existing feature"),
]


class FeatureIDFromOperation(Struct, kw_only=True):
    """Reference to feature ID created by preceding operation"""

    sn: SeqNum


FeatureIDOrSeqNum = Annotated[
    FeatureIDExisting | FeatureIDFromOperation,
    Meta(
        description="Feature ID or operation sequential number returning the "
        "feature ID. This allows to refer to features created earlier in the "
        "same transaction."
    ),
]


class OperationExecutor(abc.ABC):
    # FIXME: Overcomplicated registries, simplify me please!
    executors: ClassVar[dict[str, Type["OperationExecutor"]]] = dict()
    input_types: ClassVar[dict[str, Type[Struct]]] = dict()
    result_types: ClassVar[dict[str, Type[Struct]]] = dict()

    def __init__(self, *, txn: FeatureLayerTransaction, vobj: FVersioningMeta | None):
        self.txn = txn
        self.resource = txn.resource
        self.vobj = vobj

    @classmethod
    def register(cls, itype: Type[Struct], rtype: Type[Struct]):
        insp = type_info(itype)
        assert isinstance(insp, StructType)
        assert insp.tag_field == "action"
        assert isinstance(insp.tag, str)

        cls.executors[insp.tag] = cls
        cls.input_types[insp.tag] = itype
        cls.result_types[insp.tag] = rtype

    @abc.abstractmethod
    def prepare(self, seqnum: SeqNum, operation: Struct):
        pass

    @abc.abstractmethod
    def execute(self, seqnum: SeqNum, operation: Struct) -> Struct:
        pass

    @cached_property
    def _feature_query_first(self):
        result = self.resource.feature_query()
        result.limit(1)
        return result

    def require_versioning(self):
        if self.vobj is None:
            raise OperationError(VersioningRequired())

    def require_feature(self, fid: FeatureIDOrSeqNum, seqnum: SeqNum) -> Literal[True]:
        if isinstance(fid, int):
            self._feature_query_first.filter_by(id=fid)
            for _ in self._feature_query_first():
                return True
            raise OperationError(FeatureNotFound())

        if fid.sn >= seqnum:
            raise OperationError(InvalidSeqNum())

        action = self.txn.get_action(fid.sn)
        if action != "feature.create":
            raise OperationError(InvalidSeqNum())
        return True

    def get_feature(self, fid: FeatureID, *, seqnum: SeqNum) -> Feature:
        self._feature_query_first.filter_by(id=fid)
        for feat in self._feature_query_first():
            return feat
        raise OperationError(FeatureNotFound())

    def get_feature_id(self, fid: FeatureIDOrSeqNum, *, seqnum: SeqNum) -> int:
        if isinstance(fid, int):
            return fid

        result = self.txn.get_result_fid(fid.sn)
        assert result is not None
        return result


S = TypeVar("S", bound=Type[Struct])


@dc.dataclass
class OperationError(Exception):
    registry: ClassVar[list[Type[Struct]]] = list()
    value: Struct

    @classmethod
    def register(cls, struct: S) -> S:
        cls.registry.append(struct)
        return struct


VIDCompare = Annotated[
    int | UnsetType,
    Meta(
        description="The version ID for optimistic locking: if there are any "
        "changes after this version, the operation will raise an error."
    ),
]


# Layer operations


class RevertOperation(Struct, kw_only=True, tag="revert", tag_field="action"):
    """Revert the entire layer to a previous version."""

    vid: VIDCompare = UNSET
    tid: Annotated[int, Meta(description="Target version to revert to")]


class RevertResult(Struct, kw_only=True, tag="revert", tag_field="action"):
    pass


# Feature operations

action_tag = lambda base: dict(tag=f"feature.{base}", tag_field="action")


Geom = Annotated[
    bytes | None | UnsetType,
    Meta(
        description="A WKB-encoded geometry or NULL in the layer spatial "
        "reference system. Be aware of NULL values because it sets a feature "
        "geometry to NULL. Omit the value to keep an existing geometry in the "
        "case of update. Compatible with the changes API geometry format."
    ),
]

FieldList = Annotated[
    list[tuple[int, Any]],
    Meta(
        description="Field values as an array of pairs. The first item in the "
        "pair is a system-wide FieldID, and the second is its value. This "
        "format should be preferred over the object format with field keynames "
        "and values because field IDs are never change, but field keynames may "
        "change. It is also compatible with the changes API format.",
    ),
]

FieldMap = Annotated[
    dict[str, Any],
    Meta(
        description="Field values as an object. Keys are field keynames, and "
        "values are their values. It is better not to use this format and "
        "prefer the list of pairs format.",
    ),
]

FieldsType = Annotated[
    FieldList | FieldMap | UnsetType,
    Meta(description="Feature field values which should be set."),
]


class FeatureCreateOperation(Struct, kw_only=True, **action_tag("create")):
    """Create feature from geometry and field values"""

    geom: Geom = UNSET
    fields: FieldsType = UNSET


class FeatureCreateResult(Struct, kw_only=True, tag="feature.create", tag_field="action"):
    fid: Annotated[FeatureID, Meta(description="ID of the created feature.")]


class FeatureUpdateOperation(Struct, kw_only=True, **action_tag("update")):
    """Update feature"""

    fid: Annotated[FeatureID, Meta(description="ID of the feature to update.")]
    vid: VIDCompare = UNSET
    geom: Geom = UNSET
    fields: FieldsType = UNSET


class FeatureUpdateResult(Struct, kw_only=True, **action_tag("update")):
    pass


class FeatureDeleteOperation(Struct, kw_only=True, **action_tag("delete")):
    """Delete feature"""

    fid: Annotated[FeatureID, Meta(description="ID of the feature to delete.")]
    vid: VIDCompare = UNSET


class FeatureDeleteResult(Struct, kw_only=True, **action_tag("delete")):
    pass


class FeatureRestoreOperation(Struct, kw_only=True, **action_tag("restore")):
    """Restore feature"""

    fid: Annotated[FeatureID, Meta(description="ID of the feature to update.")]
    vid: VIDCompare = UNSET
    geom: Geom = UNSET
    fields: FieldsType = UNSET


class FeatureRestoreResult(Struct, kw_only=True, **action_tag("restore")):
    pass


OperationUnion = (
    RevertOperation
    | FeatureCreateOperation
    | FeatureUpdateOperation
    | FeatureDeleteOperation
    | FeatureRestoreOperation
)


class FeatureLayerExecutor(OperationExecutor):
    def prepare(self, seqnum: SeqNum, operation: OperationUnion):
        if isinstance(operation, RevertOperation):
            self.require_versioning()
        elif isinstance(operation, (FeatureUpdateOperation, FeatureDeleteOperation)):
            feat = self.get_feature(operation.fid, seqnum=seqnum)
            if (vid := operation.vid) is not UNSET:
                if vid != feat.version:
                    raise OperationError(FeatureConflict())

    def execute(self, seqnum: SeqNum, operation):
        resource = self.resource

        if isinstance(operation, RevertOperation):
            resource.fversioning_revert_layer(operation.tid)
            return RevertResult()

        feature = Feature(resource)

        if isinstance(
            operation,
            (FeatureUpdateOperation, FeatureDeleteOperation, FeatureRestoreOperation),
        ):
            feature.id = operation.fid

        if isinstance(
            operation,
            (FeatureCreateOperation, FeatureUpdateOperation, FeatureRestoreOperation),
        ):
            if (geom := operation.geom) is not UNSET:
                feature.geom = Geometry.from_wkb(geom) if geom else None

            if (fields := operation.fields) is not UNSET:
                if isinstance(fields, dict):
                    feature.fields.update(fields)
                elif isinstance(fields, list):
                    for fld_id, fld_val in fields:
                        for fld in self.resource.fields:
                            if fld.id == fld_id:
                                feature.fields[fld.keyname] = fld_val
                                break
                else:
                    raise NotImplementedError

        if isinstance(operation, FeatureCreateOperation):
            fid = resource.feature_create(feature)
            return FeatureCreateResult(fid=fid)

        elif isinstance(operation, FeatureUpdateOperation):
            resource.feature_put(feature)
            return FeatureUpdateResult()

        elif isinstance(operation, FeatureDeleteOperation):
            resource.feature_delete(operation.fid)
            return FeatureDeleteResult()

        elif isinstance(operation, FeatureRestoreOperation):
            resource.feature_restore(feature)
            return FeatureRestoreResult()


FeatureLayerExecutor.register(RevertOperation, RevertResult)
FeatureLayerExecutor.register(FeatureCreateOperation, FeatureCreateResult)
FeatureLayerExecutor.register(FeatureUpdateOperation, FeatureUpdateResult)
FeatureLayerExecutor.register(FeatureDeleteOperation, FeatureDeleteResult)
FeatureLayerExecutor.register(FeatureRestoreOperation, FeatureRestoreResult)


# Operation errors


@OperationError.register
class VersioningRequired(Struct, tag="versioning_required", tag_field="error"):
    status_code: int = 422
    message: str = "Feature versioning is required for this operation"


@OperationError.register
class InvalidSeqNum(Struct, tag="invalid_seqnum", tag_field="error"):
    status_code = 422
    message = "Invalid operation sequential number"


@OperationError.register
class FeatureNotFound(Struct, tag="feature.not_found", tag_field="error"):
    status_code: int = 404
    message: str = "Feature not found"


@OperationError.register
class FeatureConflict(Struct, tag="feature.conflict", tag_field="error"):
    status_code: int = 409
    message: str = "Feature version conflict"
