# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals
from datetime import datetime, timedelta
from uuid import uuid4
from StringIO import StringIO
from os import makedirs
from errno import EEXIST
import struct
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
from .event import on_style_change, on_data_change
from .util import imgcolor, affine_bounds_to_tile


TIMESTAMP_EPOCH = datetime(year=1970, month=1, day=1)

Base = declarative_base()

SEED_STATUS_ENUM = ('started', 'progress', 'completed', 'error')


class ResourceTileCache(Base):
    __tablename__ = 'resource_tile_cache'

    EXPRIRES_MAX = 2147483647

    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    uuid = db.Column(db.UUID, nullable=False)
    enabled = db.Column(db.Boolean, nullable=False, default=False)
    image_compose = db.Column(db.Boolean, nullable=False, default=False)
    max_z = db.Column(db.SmallInteger)
    ttl = db.Column(db.Integer)
    track_changes = db.Column(db.Boolean, nullable=False, default=False)
    seed_z = db.Column(db.SmallInteger)
    seed_tstamp = db.Column(db.TIMESTAMP)
    seed_status = db.Column(db.Enum(*SEED_STATUS_ENUM))
    seed_progress = db.Column(db.Integer)
    seed_total = db.Column(db.Integer)

    resource = db.relationship(Resource, backref=db.backref(
        'tile_cache', cascade='all, delete-orphan', uselist=False))

    def __init__(self, *args, **kwagrs):
        if 'uuid' not in kwagrs:
            kwagrs['uuid'] = uuid4()
        self.reconstructor()
        super(ResourceTileCache, self).__init__(*args, **kwagrs)

    @db.reconstructor
    def reconstructor(self):
        self._sameta = None
        self._tiletab = None
        self._tilestor = None

    def init_metadata(self):
        self._sameta = MetaData(schema='tile_cache')
        self._tiletab = Table(
            self.uuid.hex, self._sameta,
            db.Column('z', db.SmallInteger, primary_key=True),
            db.Column('x', db.Integer, primary_key=True),
            db.Column('y', db.Integer, primary_key=True),
            db.Column('color', db.Integer),
            # We don't need subsecond resolution which TIMESTAMP provides, so
            # use 4-byte INTEGER type. Say hello to 2038-year problem!
            db.Column('tstamp', db.Integer, nullable=False),
        )

    @property
    def sameta(self):
        if self._sameta is None:
            self.init_metadata()
        return self._sameta

    @property
    def tiletab(self):
        if self._tiletab is None:
            self.init_metadata()
        return self._tiletab

    @property
    def tilestor(self):
        if self._tilestor is None:
            try:
                p = self.tilestor_path(create=False)
                self._tilestor = sqlite3.connect(p, isolation_level=None)
            except sqlite3.OperationalError:
                # SQLite db not found, create it
                p = self.tilestor_path(create=True)
                self._tilestor = sqlite3.connect(p, isolation_level=None)

            self._tilestor.text_factory = bytes
            cur = self._tilestor.cursor()

            # Set page size according to https://www.sqlite.org/intern-v-extern-blob.html
            cur.execute("PRAGMA page_size = 8192")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tile (
                    z INTEGER, x INTEGER, y INTEGER,
                    tstamp INTEGER NOT NULL,
                    data BLOB NOT NULL,
                    PRIMARY KEY (z, x, y)
                )
            """)

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
        trow = conn.execute(db.sql.text(
            'SELECT color, tstamp '
            'FROM tile_cache."{}" '
            'WHERE z = :z AND x = :x AND y = :y'.format(self.uuid.hex)
        ), z=z, x=x, y=y).fetchone()

        if trow is None:
            return None

        color, tstamp = trow

        if self.ttl is not None:
            expdt = TIMESTAMP_EPOCH + timedelta(seconds=tstamp + self.ttl)
            if expdt <= datetime.utcnow():
                return None

        if color is not None:
            colort = tuple(map(ord, struct.pack('!i', color)))
            return Image.new('RGBA', (256, 256), colort)

        else:
            cur = self.tilestor.cursor()
            srow = cur.execute(
                'SELECT data FROM tile WHERE z = ? AND x = ? AND y = ?',
                (z, x, y)).fetchone()

            if srow is None:
                return None
            return Image.open(StringIO(srow[0]))

    def put_tile(self, tile, img):
        z, x, y = tile
        tstamp = int((datetime.utcnow() - TIMESTAMP_EPOCH).total_seconds())

        colortuple = imgcolor(img)

        color = None
        if colortuple is not None:
            color = struct.unpack('!i', bytearray(colortuple))[0]

        if color is None:
            buf = StringIO()
            img.save(buf, format='PNG')

            self.tilestor.execute(
                "DELETE FROM tile WHERE z = ? AND x = ? AND y = ?",
                (z, x, y))

            try:
                self.tilestor.execute(
                    "INSERT INTO tile VALUES (?, ?, ?, ?, ?)",
                    (z, x, y, tstamp, buf.getvalue()))

            except sqlite3.IntegrityError:
                # NOTE: Race condition with other proccess may occurs here.
                # TODO: ON CONFLICT DO ... in SQLite >= 3.24.0 (python 3)
                pass

        conn = DBSession.connection()
        conn.execute(db.sql.text(
            'DELETE FROM tile_cache."{0}" WHERE z = :z AND x = :x AND y = :y; '
            'INSERT INTO tile_cache."{0}" (z, x, y, color, tstamp) '
            'VALUES (:z, :x, :y, :color, :tstamp)'.format(self.uuid.hex)
        ), z=z, x=x, y=y, color=color, tstamp=tstamp)

        # Force zope session management to commit changes
        mark_changed(DBSession())

    def initialize(self):
        self.sameta.create_all(bind=DBSession.connection())

    def clear(self):
        """ Clear tile cache and remove all tiles """
        self._sameta = None
        self._tiletab = None
        self._tilestor = None
        self.uuid = uuid4()
        self.initialize()

    def invalidate(self, geom):
        srs = self.resource.srs
        conn = DBSession.connection()

        # TODO: This query uses sequnce scan and should be rewritten
        query_z = db.sql.text(
            'SELECT DISTINCT z FROM tile_cache."{}"'
            .format(self.uuid.hex))

        query_delete = db.sql.text(
            'DELETE FROM tile_cache."{0}" '
            'WHERE z = :z '
            '   AND x BETWEEN :xmin AND :xmax '
            '   AND y BETWEEN :ymin AND :ymax '
            .format(self.uuid.hex))

        zlist = map(lambda a: a[0], conn.execute(query_z).fetchall())
        for z in zlist:
            aft = affine_bounds_to_tile((srs.minx, srs.miny, srs.maxx, srs.maxy), z)

            xmin, ymax = map(lambda a: int(a), aft * geom.bounds[0:2])
            xmax, ymin = map(lambda a: int(a), aft * geom.bounds[2:4])

            xmin -= 1
            ymin -= 1
            xmax += 1
            ymax += 1

            env.render.logger.debug(
                'Removing tiles for z=%d x=%d..%d y=%d..%d',
                z, xmin, xmax, ymin, ymax)

            conn.execute(
                query_delete, z=z,
                xmin=xmin, ymin=ymin,
                xmax=xmax, ymax=ymax)

        mark_changed(DBSession())

    def update_seed_status(self, value, progress=None, total=None):
        self.seed_status = value
        self.seed_progress = progress
        self.seed_total = total
        self.seed_tstamp = datetime.utcnow()


db.event.listen(
    ResourceTileCache.__table__, 'after_create',
    db.DDL('CREATE SCHEMA IF NOT EXISTS tile_cache'),
    propagate=True)

db.event.listen(
    ResourceTileCache.__table__, 'after_drop',
    db.DDL('DROP SCHEMA IF EXISTS tile_cache CASCADE'),
    propagate=True)


@on_style_change.connect
def on_style_change_handler(resource):
    if (
        env.render.tile_cache_track_changes
        and resource.tile_cache is not None  # NOQA: W503
        and resource.tile_cache.track_changes  # NOQA: W503
    ):
        resource.tile_cache.clear()
        resource.tile_cache.initialize()


@on_data_change.connect
def on_data_change_handler(resource, geom):
    if (
        env.render.tile_cache_track_changes
        and resource.tile_cache is not None  # NOQA: W503
        and resource.tile_cache.track_changes  # NOQA: W503
    ):
        resource.tile_cache.invalidate(geom)


class ResourceTileCacheSeializedProperty(SerializedProperty):

    def default(self):
        column = getattr(ResourceTileCache, self.attrname)
        return column.default.arg if column.default is not None else None

    def getter(self, srlzr):
        if not env.render.tile_cache_enabled or srlzr.obj.tile_cache is None:
            return self.default()
        return getattr(srlzr.obj.tile_cache, self.attrname)

    def setter(self, srlzr, value):
        if value != self.default() or srlzr.obj.tile_cache is not None:
            if srlzr.obj.tile_cache is None:
                srlzr.obj.tile_cache = ResourceTileCache()
            setattr(srlzr.obj.tile_cache, self.attrname, value)


class ResourceTileCacheSerializer(Serializer):
    identity = 'tile_cache'
    resclass = Resource

    __permissions = dict(read=ResourceScope.read, write=ResourceScope.update)

    enabled = ResourceTileCacheSeializedProperty(**__permissions)
    image_compose = ResourceTileCacheSeializedProperty(**__permissions)
    max_z = ResourceTileCacheSeializedProperty(**__permissions)
    ttl = ResourceTileCacheSeializedProperty(**__permissions)
    track_changes = ResourceTileCacheSeializedProperty(**__permissions)
    seed_z = ResourceTileCacheSeializedProperty(**__permissions)

    def is_applicable(self):
        return IRenderableStyle.providedBy(self.obj)

    def deserialize(self):
        super(ResourceTileCacheSerializer, self).deserialize()

        if self.obj.tile_cache is not None:
            self.obj.tile_cache.initialize()
