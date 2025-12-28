from msgspec import UNSET, Struct, UnsetType

from nextgisweb.lib.safehtml import sanitize

from nextgisweb.feature_layer.transaction import (
    FeatureIDOrSeqNum,
    OperationError,
    OperationExecutor,
    SeqNum,
    VIDCompare,
)

from .model import FeatureDescription as Description

action_tag = lambda base: dict(tag=f"description.{base}", tag_field="action")


class DescriptionPutOperation(Struct, kw_only=True, **action_tag("put")):
    """Put description"""

    fid: FeatureIDOrSeqNum
    vid: VIDCompare = UNSET
    value: str | None


class DescriptionPutResult(Struct, kw_only=True, **action_tag("put")):
    pass


class DescriptionRestoreOperation(Struct, kw_only=True, **action_tag("restore")):
    """Restore description"""

    fid: int
    vid: VIDCompare = UNSET
    value: str | UnsetType = UNSET


class DescriptionRestoreResult(Struct, kw_only=True, **action_tag("restore")):
    pass


OperationUnion = DescriptionPutOperation | DescriptionRestoreOperation


class DescriptionExecutor(OperationExecutor):
    def prepare(self, seqnum: SeqNum, operation: OperationUnion):
        if isinstance(operation, (DescriptionPutOperation, DescriptionRestoreOperation)):
            self.require_feature(operation.fid, seqnum=seqnum)
            if (vid := operation.vid) is not UNSET:
                self.require_versioning()
                if Description.fversioning_vid(self.resource, operation.fid, vid) != vid:
                    raise OperationError(DescriptionConflict())

    def execute(self, seqnum: SeqNum, operation: OperationUnion):
        if isinstance(operation, DescriptionPutOperation):
            fid = self.get_feature_id(operation.fid, seqnum=seqnum)
            obj = Description.filter_by(
                resource_id=self.resource.id,
                feature_id=fid,
            ).first()

            data = operation.value
            if data is not None:
                if obj:
                    # TODO: Sanitize existing data, this keeps unsanitized data!
                    if obj.value != data and obj.value != (sntzd := sanitize(data)):
                        obj.value = sntzd
                else:
                    obj = Description(
                        resource=self.resource,
                        feature_id=fid,
                    ).persist()
                    obj.value = sanitize(data)
            elif obj:
                obj.delete()
            return DescriptionPutResult()

        if isinstance(operation, DescriptionRestoreOperation):
            obj = Description.restore(self.resource, operation.fid)
            if (value := operation.value) is not UNSET:
                obj.value = sanitize(value)
            return DescriptionRestoreResult()

        else:
            raise NotImplementedError


@OperationError.register
class DescriptionConflict(Struct, tag="description.conflict", tag_field="error"):
    status_code: int = 409
    message: str = "Description version conflict"


DescriptionExecutor.register(DescriptionPutOperation, DescriptionPutResult)
DescriptionExecutor.register(DescriptionRestoreOperation, DescriptionRestoreResult)
