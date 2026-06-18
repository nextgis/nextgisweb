import filecmp
import re
from contextlib import contextmanager
from zipfile import BadZipFile, ZipFile

from magic import from_buffer as magic_from_buffer
from msgspec import UNSET
from msgspec import DecodeError as MsgspecDecodeError
from msgspec.json import decode as msgspec_decode

from nextgisweb.env import DBSession, gettext, gettextf

from nextgisweb.core.exception import ValidationError
from nextgisweb.file_storage import FileObj

from .api_util import Metadata
from .model import FeatureAttachment


def attachments_import(resource, filename, *, replace):
    imported = 0
    skipped = 0

    @contextmanager
    def open_zip_file():
        try:
            with ZipFile(filename, mode="r") as zf:
                yield zf
        except BadZipFile:
            raise ValidationError(message=gettext("Invalid ZIP archive."))

    with open_zip_file() as z:
        try:
            metadata_info = z.getinfo("metadata.json")
        except KeyError:
            metadata_info = None

        if metadata_info is not None:
            try:
                metadata = msgspec_decode(z.read(metadata_info), type=Metadata)
            except MsgspecDecodeError as exc:
                raise ValidationError(message=exc.args[0])
            metadata_items = metadata.items
        else:
            metadata_items = None

        sources = []

        for info in z.infolist():
            if info.is_dir() or info == metadata_info:
                continue

            info_fn = info.filename
            src = dict(info=info)

            if metadata_items is not None:
                try:
                    file_md = metadata_items.pop(info_fn)
                except KeyError:
                    raise ValidationError(
                        message=gettextf("File '{}' isn't found in metadata.")(info_fn)
                    )

                src["feature_id"] = file_md.feature_id
                src["name"] = file_md.name if file_md.name is not UNSET else None
                src["mime_type"] = file_md.mime_type if file_md.mime_type is not UNSET else None
                src["keyname"] = file_md.keyname if file_md.keyname is not UNSET else None
                src["description"] = (
                    file_md.description if file_md.description is not UNSET else None
                )

            else:
                fp_match = re.match(r"^(\d+)\/([^\/]+)$", info_fn)
                if fp_match is None:
                    raise ValidationError(
                        gettextf(
                            "Invalid archive structure. Files must be placed inside the feature "
                            "directory using the format '{0}', but got '{1}'. Nested directories "
                            "are not supported."
                        ).format(
                            gettext("{feature ID}/{file name}"),
                            f"{info_fn}",
                        )
                    )

                file_fid, file_name = fp_match.groups()
                file_fid = int(file_fid)

                src["feature_id"] = file_fid
                src["name"] = file_name
                src["mime_type"] = None
                src["keyname"] = None
                src["description"] = None

            if src["mime_type"] is None:
                with z.open(info) as f:
                    src["mime_type"] = magic_from_buffer(f.read(1024), mime=True)

            sources.append(src)

        if metadata_items is not None:
            for missing in metadata_items.keys():
                raise ValidationError(
                    message=gettextf("File '{}' isn't found in the archive.")(missing)
                )

        if replace:
            rows_deleted = FeatureAttachment.filter_by(resource_id=resource.id).delete()
            if rows_deleted > 0:
                DBSession.flush()

        with DBSession.no_autoflush:
            for src in sources:
                with z.open(src["info"], "r") as sf:
                    fileobj = FileObj().copy_from(sf)

                skip = False
                if not replace:
                    for att_cmp in FeatureAttachment.filter_by(
                        resource_id=resource.id,
                        feature_id=src["feature_id"],
                        keyname=src["keyname"],
                    ):
                        fileobj_cmp = att_cmp.fileobj
                        if fileobj_cmp.size == src["info"].file_size:
                            fn_new = fileobj.filename()
                            fn_existing = fileobj_cmp.filename()
                            if filecmp.cmp(fn_new, fn_existing, False):
                                skip = True
                                break

                if not skip:
                    obj = FeatureAttachment(
                        resource=resource,
                        feature_id=src["feature_id"],
                        keyname=src["keyname"],
                        name=src["name"],
                        mime_type=src["mime_type"],
                        description=src["description"],
                    ).persist()
                    obj.fileobj = fileobj.persist()
                    obj.extract_meta()
                    imported += 1
                else:
                    skipped += 1

    return dict(imported=imported, skipped=skipped)
