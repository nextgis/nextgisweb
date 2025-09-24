import os.path
import zipfile
from typing import Annotated, Dict, List, Union

import sqlalchemy as sa
import sqlalchemy.orm as orm
from lxml import etree
from msgspec import UNSET, Meta, Struct, UnsetType

from nextgisweb.env import Base, gettext, gettextf
from nextgisweb.lib.datetime import utcnow_naive

from nextgisweb.core.exception import ValidationError
from nextgisweb.file_storage import FileObj
from nextgisweb.file_upload import FileUpload, FileUploadID, FileUploadRef
from nextgisweb.resource import Resource, ResourceGroup, ResourceScope, SAttribute, Serializer

Base.depends_on("resource")

tag_valid = r"{http://www.w3.org/2000/svg}svg"


class SVGMarkerLibrary(Base, Resource):
    identity = "svg_marker_library"
    cls_display_name = gettext("SVG marker library")

    stuuid = sa.Column(sa.Unicode(32))
    tstamp = sa.Column(sa.DateTime())

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def from_archive(self, filename):
        with zipfile.ZipFile(filename, mode="r", allowZip64=True) as archive:
            for file_info in archive.infolist():
                if file_info.is_dir():
                    continue

                filename = file_info.filename
                validate_filename(filename)

                name, ext = os.path.splitext(filename)
                validate_ext(filename, ext)

                with archive.open(filename, "r") as sf:
                    validate_mime(filename, sf)
                    sf.seek(0)

                    fileobj = FileObj().copy_from(sf)
                    self.files.append(SVGMarker(name=name, fileobj=fileobj))

        return self

    def find_svg_marker(self, name):
        svg_marker = SVGMarker.filter_by(svg_marker_library_id=self.id, name=name).one_or_none()

        return svg_marker


class SVGMarker(Base):
    __tablename__ = "svg_marker"

    id = sa.Column(sa.Integer, primary_key=True)
    svg_marker_library_id = sa.Column(sa.ForeignKey(SVGMarkerLibrary.id), nullable=False)
    fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=False)
    name = sa.Column(sa.Unicode(255), nullable=False)

    __table_args__ = (sa.UniqueConstraint(svg_marker_library_id, name),)

    fileobj = orm.relationship(FileObj, lazy="joined")

    svg_marker_library = orm.relationship(
        SVGMarkerLibrary,
        foreign_keys=svg_marker_library_id,
        backref=orm.backref("files", cascade="all,delete-orphan"),
    )

    @property
    def path(self):
        return str(self.fileobj.filename())


def validate_filename(fn):
    if os.path.isabs(fn) or fn != os.path.normpath(fn):
        raise ValidationError(gettextf("File '{}' has an insecure name.")(fn))


def validate_ext(fn, ext):
    if ext.lower() != ".svg":
        raise ValidationError(gettextf("File '{}' has an invalid extension.")(fn))


def _check_mime(fd):
    try:
        el = etree.parse(fd)
    except etree.XMLSyntaxError:
        return False
    tag = el.getroot().tag
    return tag == tag_valid


def validate_mime(fn, fd):
    if not _check_mime(fd):
        raise ValidationError(gettextf("File '{}' has a format different from SVG.")(fn))


class ArchiveAttr(SAttribute):
    def set(self, srlzr, value: FileUploadRef, *, create: bool):
        srlzr.obj.tstamp = utcnow_naive()

        # Delete all existing files, do flush due to delete before insert
        srlzr.obj.files[:] = []
        sa.inspect(srlzr.obj).session.flush()

        srlzr.obj.from_archive(value().data_path)


class FilesItemRead(Struct, kw_only=True):
    name: Annotated[str, Meta(min_length=1, max_length=255)]


class FilesItemUpdate(FilesItemRead, kw_only=True):
    id: Union[FileUploadID, UnsetType] = UNSET


class FilesAttr(SAttribute):
    def get(self, srlzr) -> List[FilesItemRead]:
        return [FilesItemRead(name=f.name) for f in srlzr.obj.files]

    def set(self, srlzr, value: List[FilesItemUpdate], *, create):
        srlzr.obj.tstamp = utcnow_naive()

        files_info: Dict[str, FilesItemUpdate] = dict()
        for f in value:
            filename = f.name
            validate_filename(filename)
            files_info[filename] = f

        def to_fileobj(fu: FileUpload, name: str):
            with fu.data_path.open("rb") as fd:
                validate_mime(name, fd)
            return fu.to_fileobj()

        removed_files = list()
        for svg_marker in srlzr.obj.files:
            if svg_marker.name not in files_info:  # Removed file
                removed_files.append(svg_marker)
            else:
                file_info = files_info.pop(svg_marker.name)
                if file_info.id is not UNSET:  # Updated file
                    fupload = FileUpload(id=file_info.id)
                    svg_marker.fileobj = to_fileobj(fupload, file_info.name)
                else:  # Untouched file
                    pass

        for f in removed_files:
            srlzr.obj.files.remove(f)

        for name, file_info in files_info.items():  # New file
            assert file_info.id is not UNSET
            fupload = FileUpload(id=file_info.id)
            svg_marker = SVGMarker(name=name, fileobj=to_fileobj(fupload, file_info.name))
            srlzr.obj.files.append(svg_marker)


class SVGMarkerLibrarySerializer(Serializer, resource=SVGMarkerLibrary):
    archive = ArchiveAttr(read=None, write=ResourceScope.update)
    files = FilesAttr(read=ResourceScope.read, write=ResourceScope.update)

    def deserialize(self):
        assert not isinstance(self.data, dict)
        if self.data.archive is not UNSET and self.data.files is not UNSET:
            raise ValidationError('"files" and "archive" attributes should not pass together.')
        super().deserialize()
