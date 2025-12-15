import abc
import dataclasses as dc
from functools import cached_property
from typing import Annotated, Any, ClassVar, Dict, List, Tuple, Type, TypeVar, Union

from msgspec import UNSET, Meta, Struct, UnsetType
from msgspec.inspect import StructType, type_info

from nextgisweb.lib.geometry import Geometry

from nextgisweb.resource import Resource

from ..feature import Feature
from ..versioning import FVersioningMeta


class OperationExecutor(abc.ABC):
    # FIXME: Overcomplicated registries, simplify me please!
    executors: ClassVar[Dict[str, Type["OperationExecutor"]]] = dict()
    input_types: ClassVar[Dict[str, Type[Struct]]] = dict()
    result_types: ClassVar[Dict[str, Type[Struct]]] = dict()

    def __init__(self, resource: Resource, *, vobj: FVersioningMeta | None):
        self.resource = resource
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
    def prepare(self, operation: Struct):
        pass

    @abc.abstractmethod
    def execute(self, operation: Struct) -> Struct:
        pass

    @cached_property
    def _feature_query_first(self):
        result = self.resource.feature_query()
        result.limit(1)
        return result

    def require_versioning(self):
        if self.vobj is None:
            raise OperationError(VersioningRequired())

    def require_feature(self, fid: int) -> Feature:
        self._feature_query_first.filter_by(id=fid)
        for feat in self._feature_query_first():
            return feat
        else:
            raise OperationError(FeatureNotFound())


S = TypeVar("S", bound=Type[Struct])


@dc.dataclass
class OperationError(Exception):
    registry: ClassVar[List[Type[Struct]]] = list()
    value: Struct

    @classmethod
    def register(cls, struct: S) -> S:
        cls.registry.append(struct)
        return struct


# Feature layer operaions

FeatureID = int

VIDCompare = Annotated[
    Union[int, UnsetType],
    Meta(
        description="The version ID for optimistic locking: if the feature is "
        "changed after this version, the operation will raise an error."
    ),
]

Geom = Annotated[
    Union[bytes, None, UnsetType],
    Meta(
        description="A WKB-encoded geometry or NULL in the layer spatial "
        "reference system. Be aware of NULL values because it sets a feature "
        "geometry to NULL. Omit the value to keep an existing geometry in the "
        "case of update. Compatible with the changes API geometry format."
    ),
]

FieldList = Annotated[
    List[Tuple[int, Any]],
    Meta(
        description="Field values as an array of pairs. The first item in the "
        "pair is a system-wide FieldID, and the second is its value. This "
        "format should be preferred over the object format with field keynames "
        "and values because field IDs are never change, but field keynames may "
        "change. It is also compatible with the changes API format.",
    ),
]

FieldMap = Annotated[
    Dict[str, Any],
    Meta(
        description="Field values as an object. Keys are field keynames, and "
        "values are their values. It is better not to use this format and "
        "prefer the list of pairs format.",
    ),
]

FieldsType = Annotated[
    Union[FieldList, FieldMap, UnsetType],
    Meta(description="Feature field values which should be set."),
]


class FeatureCreate(Struct, kw_only=True, tag="feature.create", tag_field="action"):
    """Create feature from geometry and field values"""

    geom: Geom = UNSET
    fields: FieldsType = UNSET


class FeatureCreateResult(Struct, kw_only=True, tag="feature.create", tag_field="action"):
    fid: Annotated[FeatureID, Meta(description="ID of the created feature.")]


class FeatureUpdate(Struct, kw_only=True, tag="feature.update", tag_field="action"):
    """Update feature"""

    fid: Annotated[FeatureID, Meta(description="ID of the feature to update.")]
    vid: VIDCompare = UNSET
    geom: Geom = UNSET
    fields: FieldsType = UNSET


class FeatureUpdateResult(Struct, kw_only=True, tag="feature.update", tag_field="action"):
    pass


class FeatureDelete(Struct, kw_only=True, tag="feature.delete", tag_field="action"):
    """Delete feature"""

    fid: Annotated[FeatureID, Meta(description="ID of the feature to delete.")]
    vid: VIDCompare = UNSET


class FeatureDeleteResult(Struct, kw_only=True, tag="feature.delete", tag_field="action"):
    pass


class FeatureRestore(Struct, kw_only=True, tag="feature.restore", tag_field="action"):
    """Restore feature"""

    fid: Annotated[FeatureID, Meta(description="ID of the feature to update.")]
    vid: VIDCompare = UNSET
    geom: Geom = UNSET
    fields: FieldsType = UNSET


class FeatureRestoreResult(Struct, kw_only=True, tag="feature.restore", tag_field="action"):
    pass


OperationUnion = Union[FeatureCreate, FeatureUpdate, FeatureDelete, FeatureRestore]


class FeatureLayerExecutor(OperationExecutor):
    def prepare(self, operation: OperationUnion):
        if isinstance(operation, (FeatureUpdate, FeatureDelete)):
            feat = self.require_feature(operation.fid)
            if (vid := operation.vid) is not UNSET:
                if vid != feat.version:
                    raise OperationError(FeatureConflict())

    def execute(self, operation):
        resource = self.resource
        feature = Feature(resource)

        if isinstance(operation, (FeatureUpdate, FeatureDelete, FeatureRestore)):
            feature.id = operation.fid

        if isinstance(operation, (FeatureCreate, FeatureUpdate, FeatureRestore)):
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

        if isinstance(operation, FeatureCreate):
            fid = resource.feature_create(feature)
            return FeatureCreateResult(fid=fid)

        elif isinstance(operation, FeatureUpdate):
            resource.feature_put(feature)
            return FeatureUpdateResult()

        elif isinstance(operation, FeatureDelete):
            resource.feature_delete(operation.fid)
            return FeatureDeleteResult()

        elif isinstance(operation, FeatureRestore):
            resource.feature_restore(feature)
            return FeatureRestoreResult()


FeatureLayerExecutor.register(FeatureCreate, FeatureCreateResult)
FeatureLayerExecutor.register(FeatureUpdate, FeatureUpdateResult)
FeatureLayerExecutor.register(FeatureDelete, FeatureDeleteResult)
FeatureLayerExecutor.register(FeatureRestore, FeatureRestoreResult)


# Operation errors


@OperationError.register
class VersioningRequired(Struct, tag="versioning_required", tag_field="error"):
    status_code: int = 422
    message: str = "Feature versioning is required for this operation"


@OperationError.register
class FeatureNotFound(Struct, tag="feature.not_found", tag_field="error"):
    status_code: int = 404
    message: str = "Feature not found"


@OperationError.register
class FeatureConflict(Struct, tag="feature.conflict", tag_field="error"):
    status_code: int = 409
    message: str = "Feature version conflict"
