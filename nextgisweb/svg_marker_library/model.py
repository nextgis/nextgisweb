# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import os.path
from shutil import copyfile, copyfileobj

import six
import zipfile

from .. import db
from ..env import env
from ..file_storage import FileObj
from ..models import DBSession, declarative_base
from ..resource import (
    Resource,
    Serializer,
    SerializedProperty as SP,
    DataStructureScope,
    DataScope,
    ValidationError,
    ResourceGroup)

from .util import _, COMP_ID

Base = declarative_base()

ALLOWED_EXTENSIONS = ('.svg', )


class SVGMarkerLibrary(Base, Resource):
    identity = 'svg_marker_library'
    cls_display_name = _("SVG marker library")

    __scope__ = (DataStructureScope, DataScope)

    stuuid = db.Column(db.Unicode(32))
    tstamp = db.Column(db.DateTime())

    @classmethod
    def check_parent(self, parent):
        return isinstance(parent, ResourceGroup)

    def find_svg_marker(self, candidates):
        q = SVGMarker.filter(
            SVGMarker.svg_marker_library_id == self.id,
            SVGMarker.name.in_(candidates))

        min_idx = None
        min_symb = None

        for symb in q:
            idx = candidates.index(symb.name)
            if min_idx is None or min_idx > idx:
                min_idx = idx
                min_symb = symb
                if min_idx == 0:
                    break

        return min_symb


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
    # Проверяем на вещи типа ".." в имени файла или "/" в начале.
    if os.path.isabs(filename) or filename != os.path.normpath(filename):
        raise ValidationError("Insecure filename.")


def cut_extension(filename):
    name, ext = os.path.splitext(filename)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise ValidationError("File \"%s\" has an invalid extension" % filename)
    return name


class _archive_attr(SP):

    def setter(self, srlzr, value):
        def is_dir(file_info):
            return file_info.is_dir() if six.PY3 else file_info.filename[-1] == '/'

        archive_name, metafile = env.file_upload.get_filename(value['id'])

        old_files = list(srlzr.obj.files)

        with DBSession.no_autoflush:
            for f in old_files:
                srlzr.obj.files.remove(f)

        DBSession.flush()

        with zipfile.ZipFile(archive_name, mode='r', allowZip64=True) as archive:

            for file_info in archive.infolist():

                if is_dir(file_info):
                    continue

                validate_filename(file_info.filename)

                name = cut_extension(file_info.filename)

                fileobj = env.file_storage.fileobj(component=COMP_ID)

                dstfile = env.file_storage.filename(fileobj, makedirs=True)
                with archive.open(file_info.filename, 'r') as sf, open(dstfile, 'w+b') as df:
                    copyfileobj(sf, df)

                svg_marker = SVGMarker(name=name, fileobj=fileobj)

                srlzr.obj.files.append(svg_marker)


class _files_attr(SP):

    def getter(self, srlzr):
        return [dict(name=f.name) for f in srlzr.obj.files]

    def setter(self, srlzr, value):
        files_info = dict()
        for f in value:
            filename = f.pop('name')
            validate_filename(filename)
            name = cut_extension(filename)
            files_info[name] = f

        removed_files = list()
        for svg_marker in srlzr.obj.files:
            if svg_marker.name not in files_info:  # Removed file
                removed_files.append(svg_marker)
            else:
                file_info = files_info.pop(svg_marker.name)
                if 'id' in file_info:  # Updated file
                    srcfile, metafile = env.file_upload.get_filename(file_info['id'])
                    dstfile = env.file_storage.filename(svg_marker.fileobj, makedirs=False)
                    copyfile(srcfile, dstfile)
                else:  # Untouched file
                    pass

        for f in removed_files:
            srlzr.obj.files.remove(f)

        for name, file_info in files_info.items():  # New file
            fileobj = env.file_storage.fileobj(component=COMP_ID)

            srcfile, metafile = env.file_upload.get_filename(file_info['id'])
            dstfile = env.file_storage.filename(fileobj, makedirs=True)
            copyfile(srcfile, dstfile)

            svg_marker = SVGMarker(name=name, fileobj=fileobj)

            srlzr.obj.files.append(svg_marker)


class SVGMarkerLibrarySerializer(Serializer):
    identity = SVGMarkerLibrary.identity
    resclass = SVGMarkerLibrary

    archive = _archive_attr(
        read=None,
        write=DataStructureScope.write)

    files = _files_attr(
        read=DataStructureScope.read,
        write=DataStructureScope.write)

    def deserialize(self):
        if 'files' in self.data and 'archive' in self.data:
            raise ValidationError('"files" and "archive" attributes should not pass together.')
        super(self.__class__, self).deserialize()
