# -*- coding: utf-8 -*-
from shutil import copyfileobj

import sqlalchemy as sa
import sqlalchemy.orm as orm


def initialize(comp):
    Base = comp.env.core.Base
    file_storage = comp.env.file_storage
    FileObj = comp.env.file_storage.FileObj

    class MarkerCollection(Base):
        __tablename__ = 'marker_collection'

        id = sa.Column(sa.Integer, primary_key=True)
        keyname = sa.Column(sa.Unicode, unique=True, nullable=False)
        display_name = sa.Column(sa.Unicode, nullable=False)

    class MarkerCategory(Base):
        __tablename__ = 'marker_category'
        id = sa.Column(sa.Integer, primary_key=True)
        keyname = sa.Column(sa.Unicode, unique=True, nullable=False)
        display_name = sa.Column(sa.Unicode, nullable=False)

    class Marker(Base):
        __tablename__ = 'marker'

        id = sa.Column(sa.Integer, primary_key=True)
        collection_id = sa.Column(sa.ForeignKey(MarkerCollection.id), nullable=False)
        category_id = sa.Column(sa.ForeignKey(MarkerCategory.id), nullable=False)
        keyname = sa.Column(sa.Unicode, unique=True, nullable=False)
        display_name = sa.Column(sa.Unicode, nullable=False)
        fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=False)

        collection = orm.relationship(MarkerCollection)
        category = orm.relationship(MarkerCategory)
        fileobj = orm.relationship(FileObj)

        def load_file(self, fp):
            fileobj = file_storage.fileobj(comp.identity)
            filename = file_storage.filename(fileobj, makedirs=True)

            with open(filename, 'wb') as fd:
                copyfileobj(fp, fd)

            self.fileobj = fileobj

    comp.MarkerCollection = MarkerCollection
    comp.MarkerCategory = MarkerCategory
    comp.Marker = Marker
