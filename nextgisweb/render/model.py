# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from uuid import uuid4, UUID
from collections import namedtuple
from StringIO import StringIO
from hashlib import md5

from PIL import Image
from sqlalchemy import MetaData, Table
from zope.sqlalchemy import mark_changed

from ..env import env
from .. import db
from ..models import declarative_base, DBSession
from ..resource import (
    Resource, 
    Serializer,
    SerializedProperty,
    ResourceScope, 
)

from .interface import IRenderableStyle


Base = declarative_base()

class ResourceTileCache(Base):
    __tablename__ = 'resource_tile_cache'

    EXPRIRES_MAX = 2147483647

    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    uuid = db.Column(db.UUID, nullable=False)
    enabled = db.Column(db.Boolean, nullable=False, default=False)

    resource = db.relationship(Resource, backref=db.backref(
        'tile_cache', cascade='all, delete-orphan', uselist=False))

    def __init__(self, *args, **kwagrs):
        if 'uuid' not in kwagrs:
            kwagrs['uuid'] = uuid4()
        super(ResourceTileCache, self).__init__(*args, **kwagrs)
        

    def init_metadata(self):
        self._sameta = MetaData()
        self._tiletab = Table(
            self.uuid.hex, self._sameta,
            db.Column('z', db.SmallInteger, primary_key=True),
            db.Column('x', db.Integer, primary_key=True),
            db.Column('y', db.Integer, primary_key=True),
            # Use PostgreSQL UUID-type as MD5-hash storage. There is no other
            # easy way for store fixed size binary value in PostgreSQL database.
            db.Column('digest', db.UUID, nullable=False),
            # We don't need subsecond resolution which TIMESTAMP provides, so 
            # use 4-byte INTEGER type. Say hello to 2038-year problem!
            db.Column('expires', db.Integer, nullable=False),
        )

    @property
    def sameta(self):
        if not hasattr(self, '_sameta'):
            self.init_metadata()
        return self._sameta
    
    @property
    def tiletab(self):
        if not hasattr(self, '_tiletab'):
            self.init_metadata()
        return self._tiletab

    @property
    def tilestor(self):
        if not hasattr(self, '_tilestor'):
            self._tilestor = env.render.tile_cache_storage.prefixed_db(self.uuid.bytes)
        return self._tilestor

    def get_tile(self, tile):
        # TODO: Replace with raw SQL query
        tc = self.tiletab.c
        q = db.sql.select([tc.digest, tc.expires]) \
            .where(tc.z == db.sql.bindparam('z')) \
            .where(tc.x == db.sql.bindparam('x')) \
            .where(tc.y == db.sql.bindparam('y')) 

        row = DBSession.connection().execute(q, z=tile[0], x=tile[1], y=tile[2]).fetchone()

        if row is None:
            return None

        digest, expires = row
        
        data = self.tilestor.get(digest.bytes)
        return Image.open(StringIO(data))

    def put_tile(self, tile, img):
        # Calculate image MD5 digest as UUID
        buf = StringIO()
        img.save(buf, format='PNG')
        digest = UUID(bytes=md5(buf.getvalue()).digest())

        # Save tile to LevelDB tile storage
        self.tilestor.put(digest.bytes, buf.getvalue())

        # TODO: Replace with raw SQL query
        q = self.tiletab.insert().values(
            z=db.sql.bindparam('z'),
            x=db.sql.bindparam('x'),
            y=db.sql.bindparam('y'),
            digest=db.sql.bindparam('digest'),
            expires=db.sql.bindparam('expires')
        )

        DBSession().execute(q, dict(
            z=tile[0], x=tile[1], y=tile[2],
            digest=digest, expires=self.EXPRIRES_MAX))

        # Force zope session management to commit changes
        mark_changed(DBSession())
 

class ResourceTileCacheSeializedProperty(SerializedProperty):

    def getter(self, srlzr):
        if srlzr.obj.tile_cache is None:
            srlzr.obj.tile_cache = ResourceTileCache()
        return getattr(srlzr.obj.tile_cache, self.attrname)

    def setter(self, srlzr, value):
        if srlzr.obj.tile_cache is None:
            srlzr.obj.tile_cache = ResourceTileCache()
        setattr(srlzr.obj.tile_cache, self.attrname, value)


class ResourceTileCacheSerializer(Serializer):
    identity = 'tile_cache'
    resclass = Resource

    enabled = ResourceTileCacheSeializedProperty(read=ResourceScope.read, write=ResourceScope.update)

    def is_applicable(self):
        return IRenderableStyle.providedBy(self.obj)

    def serialize(self):
        super(ResourceTileCacheSerializer, self).serialize()
        
        self.obj.tile_cache.sameta.create_all(bind=DBSession.connection())
        self.obj.tile_cache.enabled = True
