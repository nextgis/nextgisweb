# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from uuid import uuid4, UUID
from collections import namedtuple
from StringIO import StringIO
from hashlib import md5
from os import makedirs
from errno import EEXIST
import os.path
import sqlite3

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
        self._sameta = MetaData(schema='tile_cache')
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
            try:
                p = self.tilestor_path(create=False)
                self._tilestor = sqlite3.connect(p, isolation_level=None)
            except sqlite3.OperationalError as e:
                # SQLite db not found, create it
                p = self.tilestor_path(create=True)
                self._tilestor = sqlite3.connect(p, isolation_level=None)
            
            self._tilestor.text_factory = bytes
            cur = self._tilestor.cursor()
            
            # Set page size according to https://www.sqlite.org/intern-v-extern-blob.html
            cur.execute("PRAGMA page_size = 8192")
            cur.execute("CREATE TABLE IF NOT EXISTS tile (sid BLOB PRIMARY KEY, data BLOB)")

        return self._tilestor

    def tilestor_path(self, create=False):
        tcpath = env.render.tile_cache_path
        suuid = self.uuid.hex
        d = os.path.join(tcpath, suuid[0:2], suuid[2:4])
        if create:
            if not os.path.isdir(d):
                if not os.path.isdir(tcpath):
                    raise RuntimeError("Path '{}' doen't exists!".format(tcpath))
                try:
                    makedirs(d) 
                except OSError as exc:
                    # Ignore 'File exists' error in concurency conditions
                    # TODO: Add exist_ok=True for Python3 instead of exception
                    if exc.errno != EEXIST:
                        raise

        return os.path.join(d, suuid)

    def get_tile(self, tile):
        z, x, y = tile
       
        conn = DBSession.connection()
        row = conn.execute(db.sql.text(
            'SELECT digest, expires '
            'FROM tile_cache."{}" '
            'WHERE z = :z AND x = :x AND y = :y'.format(self.uuid.hex)
        ), z=z, x=x, y=y).fetchone()

        if row is None:
            return None

        digest, expires = row
        
        cur = self.tilestor.cursor()
        cur.execute('SELECT data FROM tile WHERE sid = ?', (digest.bytes, ))
        
        row = cur.fetchone()
        if row is None:
            return None
        
        data = row[0]       
        return Image.open(StringIO(data))

    def put_tile(self, tile, img):
        z, x, y = tile

        # Calculate image MD5 digest as UUID
        buf = StringIO()
        img.save(buf, format='PNG')
        digest = UUID(bytes=md5(buf.getvalue()).digest())

        cur = self.tilestor.cursor()
        try:
            cur.execute("INSERT INTO tile VALUES (?, ?)", (digest.bytes, buf.getvalue()))
        except sqlite3.IntegrityError as exc:
            # Ignore if tile already exists: other process can add it
            # TODO: ON CONFLICT DO NOTHING in SQLite >= 3.24.0
            pass

        conn = DBSession.connection()
        conn.execute(db.sql.text(
            'INSERT INTO tile_cache."{}" (z, x, y, digest, expires) '
            'VALUES (:z, :x, :y, :digest, :expires)'.format(self.uuid.hex)
        ), z=z, x=x, y=y, digest=digest, expires=self.EXPRIRES_MAX)

        # Force zope session management to commit changes
        mark_changed(DBSession())

db.event.listen(
    ResourceTileCache.__table__, 'after_create',
    db.DDL('CREATE SCHEMA IF NOT EXISTS tile_cache'),
    propagate=True)

db.event.listen(
    ResourceTileCache.__table__, 'after_drop',
    db.DDL('DROP SCHEMA IF EXISTS tile_cache'),
    propagate=True)


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
