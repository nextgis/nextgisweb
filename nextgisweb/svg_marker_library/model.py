import os.path
from datetime import datetime
from shutil import copyfileobj

import magic
import zipfile

from .. import db
from ..core.exception import ValidationError
from ..env import env
from ..file_storage import FileObj
from ..models import DBSession, declarative_base
from ..resource import (
    Resource,
    Serializer,
    SerializedProperty as SP,
    ResourceScope,
    ResourceGroup)

from .util import _, COMP_ID

Base = declarative_base(dependencies=('resource', ))

mime_valid = 'image/svg+xml'


class SVGMarkerLibrary(Base, Resource):
    identity = 'svg_marker_library'
    cls_display_name = _("SVG marker library")

    stuuid = db.Column(db.Unicode(32))
    tstamp = db.Column(db.DateTime())

    @classmethod
    def check_parent(self, parent):
        return isinstance(parent, ResourceGroup)

    def find_svg_marker(self, name):
        svg_marker = SVGMarker.filter_by(
            svg_marker_library_id=self.id,
            name=name
        ).one_or_none()

        return svg_marker


class SVGMarker(Base):
    __tablename__ = 'svg_marker'

    id = db.Column(db.Integer, primary_key=True)
    svg_marker_library_id = db.Column(db.ForeignKey(SVGMarkerLibrary.id), nullable=False)
    fileobj_id = db.Column(db.ForeignKey(FileObj.id), nullable=False)
    name = db.Column(db.Unicode(255), nullable=False)

    __table_args__ = (
        db.UniqueConstraint(svg_marker_library_id, name),
    )

    fileobj = db.relationship(FileObj, lazy='joined')

    svg_marker_library = db.relationship(
        SVGMarkerLibrary, foreign_keys=svg_marker_library_id,
        backref=db.backref('files', cascade='all,delete-orphan'))

    @property
    def path(self):
        return env.file_storage.filename(self.fileobj)


def validate_filename(filename):
    if os.path.isabs(filename) or filename != os.path.normpath(filename):
        raise ValidationError(_("Insecure filename \"%s\".") % filename)


def validate_ext(filename, ext):
    if ext.lower() != '.svg':
        raise ValidationError(_("File \"%s\" has an invalid extension.") % filename)


def validate_mime(filename, buf):
    mime = magic.from_buffer(buf, mime=True)
    if mime != mime_valid:
        raise ValidationError(_("File type \"%s\" is not SVG.") % filename)


class _archive_attr(SP):

    def setter(self, srlzr, value):
        srlzr.obj.tstamp = datetime.utcnow()

        archive_name, metafile = env.file_upload.get_filename(value['id'])

        old_files = list(srlzr.obj.files)

        with DBSession.no_autoflush:
            for f in old_files:
                srlzr.obj.files.remove(f)

        DBSession.flush()

        with zipfile.ZipFile(archive_name, mode='r', allowZip64=True) as archive:
            for file_info in archive.infolist():
                if file_info.is_dir():
                    continue

                filename = file_info.filename
                validate_filename(filename)

                name, ext = os.path.splitext(filename)
                validate_ext(filename, ext)

                fileobj = env.file_storage.fileobj(component=COMP_ID)

                dstfile = env.file_storage.filename(fileobj, makedirs=True)
                with archive.open(filename, 'r') as sf:
                    validate_mime(filename, sf.read(1024))
                    sf.seek(0)
                    with open(dstfile, 'wb') as df:
                        copyfileobj(sf, df)

                srlzr.obj.files.append(SVGMarker(name=name, fileobj=fileobj))


class _files_attr(SP):

    def getter(self, srlzr):
        return [dict(name=f.name) for f in srlzr.obj.files]

    def setter(self, srlzr, value):
        srlzr.obj.tstamp = datetime.utcnow()

        files_info = dict()
        for f in value:
            filename = f['name']
            validate_filename(filename)
            name, ext = os.path.splitext(filename)
            if 'id' in f:
                validate_ext(filename, ext)
            files_info[name] = f

        def copy_file_validate(srcfile, dstfile, filename):
            with open(srcfile, 'rb') as sf:
                validate_mime(filename, sf.read(1024))
                sf.seek(0)
                with open(dstfile, 'wb') as df:
                    copyfileobj(sf, df)

        removed_files = list()
        for svg_marker in srlzr.obj.files:
            if svg_marker.name not in files_info:  # Removed file
                removed_files.append(svg_marker)
            else:
                file_info = files_info.pop(svg_marker.name)
                if 'id' in file_info:  # Updated file
                    srcfile, metafile = env.file_upload.get_filename(file_info['id'])
                    dstfile = env.file_storage.filename(svg_marker.fileobj, makedirs=False)
                    copy_file_validate(srcfile, dstfile, file_info['name'])
                else:  # Untouched file
                    pass

        for f in removed_files:
            srlzr.obj.files.remove(f)

        for name, file_info in files_info.items():  # New file
            fileobj = env.file_storage.fileobj(component=COMP_ID)

            srcfile, metafile = env.file_upload.get_filename(file_info['id'])
            dstfile = env.file_storage.filename(fileobj, makedirs=True)
            copy_file_validate(srcfile, dstfile, file_info['name'])

            svg_marker = SVGMarker(name=name, fileobj=fileobj)

            srlzr.obj.files.append(svg_marker)


class SVGMarkerLibrarySerializer(Serializer):
    identity = SVGMarkerLibrary.identity
    resclass = SVGMarkerLibrary

    archive = _archive_attr(read=None, write=ResourceScope.update)
    files = _files_attr(read=ResourceScope.read, write=ResourceScope.update)

    def deserialize(self):
        if 'files' in self.data and 'archive' in self.data:
            raise ValidationError('"files" and "archive" attributes should not pass together.')
        super().deserialize()
