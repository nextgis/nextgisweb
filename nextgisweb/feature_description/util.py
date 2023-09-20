from contextlib import contextmanager
from zipfile import BadZipFile, ZipFile

from nextgisweb.env import DBSession, _
from nextgisweb.lib.json import loadb

from nextgisweb.core.exception import ValidationError

from .model import FeatureDescription


def descriptions_import(resource, filename):
    @contextmanager
    def open_zip_file():
        try:
            with ZipFile(filename, mode="r") as zf:
                yield zf
        except BadZipFile:
            raise ValidationError(message=_("Invalid ZIP archive."))

    with open_zip_file() as z:
        metadata = loadb(z.read("metadata.json"))

    with DBSession.no_autoflush:
        for fid_str, description in metadata["items"].items():
            FeatureDescription(
                resource=resource,
                feature_id=int(fid_str),
                value=description,
            ).persist()
