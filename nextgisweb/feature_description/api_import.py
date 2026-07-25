import re
from contextlib import contextmanager
from zipfile import BadZipFile, ZipFile

from lxml.html import document_fromstring, tostring

from nextgisweb.env import DBSession, gettext, gettextf
from nextgisweb.lib.safehtml import sanitize

from nextgisweb.core.exception import ValidationError

from .model import FeatureDescription


def descriptions_import(resource, filename, *, replace):
    @contextmanager
    def open_zip_file():
        try:
            with ZipFile(filename, mode="r") as zf:
                yield zf
        except BadZipFile:
            raise ValidationError(message=gettext("Invalid ZIP archive."))

    with open_zip_file() as z:
        fid_arcname = dict[int, str]()

        for info in z.infolist():
            if info.is_dir():
                continue

            fn_match = re.match(r"^(\d+)\.html$", info.filename, re.IGNORECASE)
            if fn_match is None:
                raise ValidationError(
                    gettextf(
                        "Files must be named using the format '{0}.html', but got '{1}'."
                    ).format(gettext("{feature ID}"), info.filename)
                )

            fid = int(fn_match[1])
            fid_arcname[fid] = info.filename

        if replace:
            rows_deleted = FeatureDescription.filter_by(resource_id=resource.id).delete()
            if rows_deleted > 0:
                DBSession.flush()

        with DBSession.no_autoflush:
            for fid, arcname in fid_arcname.items():
                if not replace:
                    fd = FeatureDescription.filter_by(
                        resource_id=resource.id,
                        feature_id=fid,
                    ).one_or_none()
                    if fd is not None:
                        continue

                content = z.read(arcname).decode()
                root = document_fromstring(content)
                body = root.find("body")

                if body is None:
                    raise ValidationError(
                        gettextf(
                            "The file '{0}' does not contain a <body> element and cannot be processed."
                        ).format(arcname)
                    )

                body_inner_html = (body.text or "") + "".join(
                    tostring(child, encoding="unicode") for child in body
                )

                FeatureDescription(
                    resource=resource,
                    feature_id=fid,
                    value=sanitize(body_inner_html),
                ).persist()
