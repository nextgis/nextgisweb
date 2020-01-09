# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import io

from collections import OrderedDict
from shutil import copyfileobj

from .. import db
from ..env import env
from ..models import declarative_base
from ..resource import Resource
from ..file_storage import FileObj

Base = declarative_base()


class FeatureAttachment(Base):
    __tablename__ = 'feature_attachment'

    id = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(db.ForeignKey(Resource.id), nullable=False)
    feature_id = db.Column(db.Integer, nullable=False)
    fileobj_id = db.Column(db.ForeignKey(FileObj.id), nullable=False)

    name = db.Column(db.Unicode, nullable=True)
    size = db.Column(db.BigInteger, nullable=False)
    mime_type = db.Column(db.Unicode, nullable=False)

    description = db.Column(db.Unicode, nullable=True)

    fileobj = db.relationship(FileObj, lazy='joined')

    resource = db.relationship(Resource, backref=db.backref(
        '__feature_attachment', cascade='all'))

    @property
    def is_image(self):
        return self.mime_type in ('image/jpeg', 'image/png')

    def serialize(self):
        return OrderedDict((
            ('id', self.id), ('name', self.name),
            ('size', self.size), ('mime_type', self.mime_type),
            ('description', self.description),
            ('is_image', self.is_image)))

    def deserialize(self, data):
        file_upload = data.get('file_upload')
        if file_upload is not None:
            self.fileobj = env.file_storage.fileobj(
                component='feature_attachment')

            srcfile, _ = env.file_upload.get_filename(file_upload['id'])
            dstfile = env.file_storage.filename(self.fileobj, makedirs=True)

            with io.open(srcfile, 'rb') as fs, io.open(dstfile, 'wb') as fd:
                copyfileobj(fs, fd)

            for k in ('name', 'mime_type', 'size'):
                if k in file_upload:
                    setattr(self, k, file_upload[k])

        for k in ('name', 'mime_type', 'description'):
            if k in data:
                setattr(self, k, data[k])
