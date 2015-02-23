# -*- coding: utf-8 -*-
from __future__ import unicode_literals
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

    fileobj = db.relationship(FileObj)

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

    @classmethod
    def deserialize(cls, feature, data):
        if 'id' in data:
            obj = FeatureAttachment.filter_by(
                id=data['id'], feature_id=feature.id,
                resource_id=feature.layer.id,
            ).one()
        else:
            obj = FeatureAttachment(
                resource_id=feature.layer.id,
                feature_id=feature.id)
            obj.persist()

        file_upload = data.get('file_upload')
        if file_upload is not None:
            obj.fileobj = env.file_storage.fileobj(
                component='feature_attachment')

            srcfile, _ = env.file_upload.get_filename(file_upload['id'])
            dstfile = env.file_storage.filename(obj.fileobj, makedirs=True)

            with open(srcfile, 'r') as fs, open(dstfile, 'w') as fd:
                copyfileobj(fs, fd)

            for k in ('name', 'mime_type', 'size'):
                if k in file_upload:
                    setattr(obj, k, file_upload[k])

        for k in ('name', 'mime_type', 'description'):
            if k in data:
                setattr(obj, k, data[k])

        return obj
