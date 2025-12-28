from typing import ClassVar

import sqlalchemy as sa
from msgspec import UNSET, Struct, UnsetType
from sqlalchemy.exc import NoResultFound

from nextgisweb.feature_layer.transaction import (
    FeatureID,
    FeatureIDOrSeqNum,
    OperationError,
    OperationExecutor,
    SeqNum,
    VIDCompare,
)
from nextgisweb.file_storage import FileObj
from nextgisweb.file_upload import FileUploadRef

from .model import FeatureAttachment as Attachment

AttachmentID = int

action_tag = lambda base: dict(tag=f"attachment.{base}", tag_field="action")


class CopyToMixin:
    attrs: ClassVar[list[str]] = ["keyname", "name", "mime_type", "description"]

    def copy_to(self, dest) -> bool:
        updated = False
        for a in self.attrs:
            if (value := getattr(self, a)) is not UNSET:
                if getattr(dest, a) != value:
                    setattr(dest, a, value)
                    updated = True

        return updated


class SourceFileUploadRef(FileUploadRef, kw_only=True, tag="file_upload"):
    pass


class AttachmentCreateOperation(Struct, CopyToMixin, kw_only=True, **action_tag("create")):
    """Create attachment"""

    fid: FeatureIDOrSeqNum
    source: SourceFileUploadRef
    keyname: str | None | UnsetType = UNSET
    name: str | None | UnsetType = UNSET
    mime_type: str | UnsetType = UNSET
    description: str | None | UnsetType = UNSET


class AttachmentCreateResult(Struct, kw_only=True, **action_tag("create")):
    aid: AttachmentID
    fileobj: int


class AttachmentUpdateOperation(Struct, CopyToMixin, kw_only=True, **action_tag("update")):
    """Update attachment"""

    fid: FeatureID
    aid: AttachmentID
    vid: VIDCompare = UNSET
    source: SourceFileUploadRef | UnsetType = UNSET
    keyname: str | None | UnsetType = UNSET
    name: str | None | UnsetType = UNSET
    mime_type: str | UnsetType = UNSET
    description: str | None | UnsetType = UNSET


class AttachmentUpdateResult(Struct, kw_only=True, **action_tag("update")):
    fileobj: int | UnsetType = UNSET


class AttachmentDeleteOperation(Struct, kw_only=True, **action_tag("delete")):
    """Delete attachment"""

    fid: FeatureID
    aid: AttachmentID
    vid: VIDCompare = UNSET


class AttachmentDeleteResult(Struct, kw_only=True, **action_tag("delete")):
    pass


class AttachmentRestoreOperation(Struct, CopyToMixin, kw_only=True, **action_tag("restore")):
    """Restore attachment"""

    fid: FeatureID
    aid: AttachmentID
    vid: VIDCompare = UNSET
    source: SourceFileUploadRef | UnsetType = UNSET
    keyname: str | None | UnsetType = UNSET
    name: str | None | UnsetType = UNSET
    mime_type: str | UnsetType = UNSET
    description: str | None | UnsetType = UNSET


class AttachmentRestoreResult(Struct, kw_only=True, **action_tag("restore")):
    pass


OperationUnion = (
    AttachmentCreateOperation
    | AttachmentUpdateOperation
    | AttachmentDeleteOperation
    | AttachmentRestoreOperation
)


class AttachmentExecutor(OperationExecutor):
    def prepare(self, seqnum: SeqNum, operation: OperationUnion):
        self.require_feature(operation.fid, seqnum=seqnum)
        if isinstance(operation, (AttachmentUpdateOperation, AttachmentDeleteOperation)):
            self.require_attachment(operation.fid, operation.aid)
        if isinstance(
            operation,
            (AttachmentUpdateOperation, AttachmentDeleteOperation, AttachmentRestoreOperation),
        ):
            if (vid := operation.vid) is not UNSET:
                self.require_versioning()
                if (
                    Attachment.fversioning_vid(self.resource, operation.fid, operation.aid)
                ) != vid:
                    raise OperationError(AttachmentConflict())

    def execute(self, seqnum: SeqNum, operation: OperationUnion):
        if isinstance(operation, (AttachmentUpdateOperation, AttachmentDeleteOperation)):
            obj = self.require_attachment(operation.fid, operation.aid)
        elif isinstance(operation, AttachmentCreateOperation):
            fid = self.get_feature_id(operation.fid, seqnum=seqnum)
            obj = Attachment(
                resource=self.resource,
                feature_id=fid,
            ).persist()
        elif isinstance(operation, AttachmentRestoreOperation):
            obj = Attachment.restore(self.resource, operation.fid, operation.aid)
            with sa.inspect(obj).session.no_autoflush:
                obj.fileobj = FileObj.filter_by(id=obj.fileobj_id).one()
        else:
            raise NotImplementedError

        updated_fileobj = False

        if isinstance(
            operation,
            (AttachmentCreateOperation, AttachmentUpdateOperation, AttachmentRestoreOperation),
        ):
            if (value := operation.source) is not UNSET:
                obj.load_file_upload(value())
                updated_fileobj = True
            elif isinstance(operation, AttachmentRestoreOperation):
                obj.size = obj.fileobj.size
                obj.extract_meta()
            operation.copy_to(obj)
        elif isinstance(operation, AttachmentDeleteOperation):
            obj.delete()
        else:
            raise NotImplementedError

        sa.inspect(obj).session.flush()

        if isinstance(operation, AttachmentCreateOperation):
            result = AttachmentCreateResult(
                aid=obj.id,
                fileobj=obj.fileobj.id,
            )
        elif isinstance(operation, AttachmentUpdateOperation):
            result = AttachmentUpdateResult(
                fileobj=obj.fileobj.id if updated_fileobj else UNSET,
            )
        elif isinstance(operation, AttachmentDeleteOperation):
            result = AttachmentDeleteResult()
        elif isinstance(operation, AttachmentRestoreOperation):
            return AttachmentRestoreResult()
        else:
            raise NotImplementedError

        return result

    def require_attachment(self, fid: FeatureID, aid: AttachmentID) -> Attachment:
        try:
            return Attachment.filter_by(
                resource_id=self.resource.id,
                feature_id=fid,
                id=aid,
            ).one()
        except NoResultFound:
            raise OperationError(AttachmentNotFound())


@OperationError.register
class AttachmentNotFound(Struct, tag="attachment.not_found", tag_field="error"):
    status_code: int = 404
    message: str = "Attachment not found"


@OperationError.register
class AttachmentConflict(Struct, tag="attachment.conflict", tag_field="error"):
    status_code: int = 409
    message: str = "Attachment version conflict"


AttachmentExecutor.register(AttachmentCreateOperation, AttachmentCreateResult)
AttachmentExecutor.register(AttachmentUpdateOperation, AttachmentUpdateResult)
AttachmentExecutor.register(AttachmentDeleteOperation, AttachmentDeleteResult)
AttachmentExecutor.register(AttachmentRestoreOperation, AttachmentRestoreResult)
