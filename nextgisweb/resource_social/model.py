# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from shutil import copyfile

from .. import db
from ..env import env
from ..file_storage import FileObj
from ..models import DBSession, declarative_base
from ..resource import (
    MetadataScope,
    Resource,
    Serializer,
    SerializedProperty as SP,
)

from .util import COMP_ID


Base = declarative_base()


class ResourceSocial(Base):
    __tablename__ = COMP_ID

    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    preview_fileobj_id = db.Column(db.ForeignKey(FileObj.id))

    resource = db.relationship(Resource, backref=db.backref(
        'social', cascade='all, delete-orphan', uselist=False, lazy='joined'))
    preview_fileobj = db.relationship(FileObj, lazy='joined')


class _preview_file_upload_attr(SP):

    def setter(self, srlzr, value):
        if srlzr.obj.social is None:
            srlzr.obj.social = ResourceSocial()

        social = srlzr.obj.social
        if value is None and social.preview_fileobj is not None:
            fileobj = social.preview_fileobj
            social.preview_fileobj = None
            DBSession.delete(fileobj)
        else:
            fileobj = env.file_storage.fileobj(component=COMP_ID)

            srcfile, _ = env.file_upload.get_filename(value['id'])
            dstfile = env.file_storage.filename(fileobj, makedirs=True)

            copyfile(srcfile, dstfile)
            social.preview_fileobj = fileobj


class ResourceSocialSerializer(Serializer):
    identity = COMP_ID
    resclass = Resource

    preview_file_upload = _preview_file_upload_attr(write=MetadataScope.write)
