import os.path
import zipfile
from datetime import datetime

import magic
import sqlalchemy as sa
import sqlalchemy.orm as orm

from nextgisweb.env import Base, _

from nextgisweb.core.exception import ValidationError
from nextgisweb.file_storage import FileObj
from nextgisweb.file_upload import FileUpload
from nextgisweb.resource import Resource, ResourceGroup, ResourceScope, Serializer
from nextgisweb.resource import SerializedProperty as SP

Base.depends_on("resource")

mime_valid = "image/svg+xml"


class SVGMarkerLibrary(Base, Resource):
    identity = "svg_marker_library"
    cls_display_name = _("SVG marker library")

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
                    validate_mime(filename, sf.read(1024))
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


def validate_filename(filename):
    if os.path.isabs(filename) or filename != os.path.normpath(filename):
        raise ValidationError(_("File '{}' has an insecure name.").format(filename))


def validate_ext(filename, ext):
    if ext.lower() != ".svg":
        raise ValidationError(_("File '{}' has an invalid extension.").format(filename))


def validate_mime(filename, buf):
    mime = magic.from_buffer(buf, mime=True)
    if mime != mime_valid:
        raise ValidationError(_("File '{}' has a format different from SVG.").format(filename))


class _archive_attr(SP):
    def setter(self, srlzr, value):
        srlzr.obj.tstamp = datetime.utcnow()

        # Delete all existing files, do flush due to delete before insert
        srlzr.obj.files[:] = []
        sa.inspect(srlzr.obj).session.flush()

        fupload = FileUpload(id=value["id"])
        srlzr.obj.from_archive(fupload.data_path)


class _files_attr(SP):
    def getter(self, srlzr):
        return [dict(name=f.name) for f in srlzr.obj.files]

    def setter(self, srlzr, value):
        srlzr.obj.tstamp = datetime.utcnow()

        files_info = dict()
        for f in value:
            filename = f["name"]
            validate_filename(filename)
            files_info[filename] = f

        def to_fileobj(fu: FileUpload):
            with fu.data_path.open("rb") as fd:
                validate_mime(fu.name, fd.read(1024))
            return fu.to_fileobj()

        removed_files = list()
        for svg_marker in srlzr.obj.files:
            if svg_marker.name not in files_info:  # Removed file
                removed_files.append(svg_marker)
            else:
                file_info = files_info.pop(svg_marker.name)
                if "id" in file_info:  # Updated file
                    fupload = FileUpload(id=file_info["id"], name=file_info["name"])
                    svg_marker.fileobj = to_fileobj(fupload)
                else:  # Untouched file
                    pass

        for f in removed_files:
            srlzr.obj.files.remove(f)

        for name, file_info in files_info.items():  # New file
            fupload = FileUpload(id=file_info["id"], name=file_info["name"])
            svg_marker = SVGMarker(name=name, fileobj=to_fileobj(fupload))
            srlzr.obj.files.append(svg_marker)


class SVGMarkerLibrarySerializer(Serializer):
    identity = SVGMarkerLibrary.identity
    resclass = SVGMarkerLibrary

    archive = _archive_attr(read=None, write=ResourceScope.update)
    files = _files_attr(read=ResourceScope.read, write=ResourceScope.update)

    def deserialize(self):
        if "files" in self.data and "archive" in self.data:
            raise ValidationError('"files" and "archive" attributes should not pass together.')
        super().deserialize()
