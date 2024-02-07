import filecmp
from contextlib import contextmanager
from zipfile import BadZipFile, ZipFile

from magic import from_buffer as magic_from_buffer

from nextgisweb.env import DBSession, _
from nextgisweb.lib.json import loadb

from nextgisweb.core.exception import ValidationError
from nextgisweb.file_storage import FileObj

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
            raise ValidationError(message=_("Invalid ZIP archive."))

    with open_zip_file() as z:
        try:
            metadata_info = z.getinfo("metadata.json")
        except KeyError:
            metadata_info = None

        if metadata_info is not None:
            metadata = loadb(z.read(metadata_info))
            metadata_items = metadata.get("items")
        else:
            metadata = None
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
                        message=_("File '{}' isn't found in metadata.").format(info_fn)
                    )

                file_name = file_md.get("name")
                if file_name is not None and not isinstance(file_name, str):
                    raise ValidationError(message=_("Invalid name for file '{}'.").format(info_fn))
                src["name"] = file_name

                file_fid = file_md.get("feature_id")
                if not isinstance(file_fid, int):
                    raise ValidationError(
                        message=_("Invalid feature ID for file '{}'.").format(info_fn)
                    )
                src["feature_id"] = file_fid

                file_mime = file_md.get("mime_type")
                if file_mime is not None and not isinstance(file_mime, str):
                    raise ValidationError(
                        message=_("Invalid MIME type for file '{}'.").format(info_fn)
                    )
                src["mime_type"] = file_mime

                file_desc = file_md.get("description")
                if file_desc is not None and not isinstance(file_desc, str):
                    raise ValidationError(
                        message=_("Invalid description for file '{}'.").format(info_fn)
                    )
                src["description"] = file_desc

            else:
                try:
                    file_fid, file_name = info.filename.split("/", 2)
                    if file_fid.isdigit():
                        file_fid = int(file_fid)
                    else:
                        raise ValueError
                except ValueError:
                    raise ValidationError(
                        message=_("Could not determine feature ID for file '{}'.").format(info_fn)
                    )

                src["feature_id"] = file_fid
                src["name"] = file_name
                src["mime_type"] = None
                src["description"] = None

            if src["mime_type"] is None:
                with z.open(info) as f:
                    src["mime_type"] = magic_from_buffer(f.read(1024), mime=True)

            sources.append(src)

        if metadata_items is not None:
            for missing in metadata_items.keys():
                raise ValidationError(
                    message=_("File '{}' isn't found in the archive.").format(missing)
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
                        size=src["info"].file_size,
                    ):
                        fn_new = fileobj.filename()
                        fn_existing = att_cmp.fileobj.filename()
                        if filecmp.cmp(fn_new, fn_existing, False):
                            skip = True
                            break

                if not skip:
                    obj = FeatureAttachment(
                        resource=resource,
                        feature_id=src["feature_id"],
                        name=src["name"],
                        mime_type=src["mime_type"],
                        description=src["description"],
                        size=src["info"].file_size,
                    ).persist()
                    obj.fileobj = fileobj.persist()
                    obj.extract_meta()
                    imported += 1
                else:
                    skipped += 1

    return dict(imported=imported, skipped=skipped)
