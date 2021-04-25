# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
from datetime import datetime, timedelta
from uuid import uuid4
from threading import Thread
import logging
from time import time
import os.path
import sqlite3
from io import BytesIO
from six.moves.queue import Queue, Empty, Full

import transaction
from PIL import Image
from sqlalchemy import MetaData, Table
from zope.sqlalchemy import mark_changed

from ..compat import Path, lru_cache
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
from .util import imgcolor, affine_bounds_to_tile, pack_color, unpack_color

_logger = logging.getLogger(__name__)


TIMESTAMP_EPOCH = datetime(year=1970, month=1, day=1)

Base = declarative_base(dependencies=('resource', ))

SEED_STATUS_ENUM = ('started', 'progress', 'completed', 'error')

QUEUE_MAX_SIZE = 256
QUEUE_STUCK_TIMEOUT = 5.0
BATCH_MAX_TILES = 32
BATCH_DEADLINE = 0.5
SQLITE_CON_CACHE = 32


@lru_cache(SQLITE_CON_CACHE)
def get_tile_db(db_path):
    p = Path(db_path)
    if not p.parent.exists():
        p.parent.mkdir(parents=True)
    connection = sqlite3.connect(
        db_path, isolation_level='DEFERRED', check_same_thread=False)

    connection.text_factory = bytes
    cur = connection.cursor()

    # For better concurency and avoiding lock timeout errors during reading:
    cur.execute("PRAGMA journal_mode = WAL")

    # Set page size according to https://www.sqlite.org/intern-v-extern-blob.html
    cur.execute("PRAGMA page_size = 8192")

    # CREATE TABLE IF NOT EXISTS causes SQLite database lock. So check the tile
    # table existance before table creation.
    table_exists = cur.execute("""
        SELECT 1 FROM sqlite_master
        WHERE type='table' AND name='tile'
    """).fetchone() is not None

    if not table_exists:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS tile (
                z INTEGER, x INTEGER, y INTEGER,
                tstamp INTEGER NOT NULL,
                data BLOB NOT NULL,
                PRIMARY KEY (z, x, y)
            )
        """)

        connection.commit()

    return connection


class TileWriterQueueException(Exception):
    pass


class TileWriterQueueFullException(TileWriterQueueException):
    pass


class TileWriterQueueStuckException(TileWriterQueueException):
    pass


class TilestorWriter:
    __instance = None

    def __init__(self):
        if TilestorWriter.__instance is None:
            self.queue = Queue(maxsize=QUEUE_MAX_SIZE)
            self.cstart = None

            self._worker = Thread(target=self._job)
            self._worker.daemon = True
            self._worker.start()
            self._write_stack = []

    @classmethod
    def getInstance(cls):
        if cls.__instance is None:
            cls.__instance = TilestorWriter()
        return cls.__instance

    def put(self, payload):
        cstart = self.cstart
        if cstart is not None:
            cdelta = time() - cstart
            if cdelta > QUEUE_STUCK_TIMEOUT:
                raise TileWriterQueueStuckException(
                    "Tile writer queue is stuck for {} seconds.".format(cdelta))

        try:
            self.queue.put_nowait(payload)
        except Full:
            raise TileWriterQueueFullException(
                "Tile writer queue is full at maxsize {}.".format(
                    self.queue.maxsize))

    def _job(self):
        while True:
            self.cstart = None
            data = self.queue.get()
            self.cstart = ptime = time()

            tiles_written = 0
            time_taken = 0.0

            answers = []

            # Tile cache writer may fall sometimes in case of database connecti
            # problem for example. So we just skip a tile with error and log an
            # exception.
            try:

                with transaction.manager:
                    conn = DBSession.connection()
                    tilestor = get_tile_db(data['db_path'])

                    while data is not None:
                        z, x, y = data['tile']
                        tstamp = int((datetime.utcnow() - TIMESTAMP_EPOCH).total_seconds())

                        img = data['img']

                        colortuple = imgcolor(img)
                        color = pack_color(colortuple) if colortuple is not None else None

                        conn.execute(db.sql.text(
                            'DELETE FROM tile_cache."{0}" WHERE z = :z AND x = :x AND y = :y; '
                            'INSERT INTO tile_cache."{0}" (z, x, y, color, tstamp) '
                            'VALUES (:z, :x, :y, :color, :tstamp)'.format(data['uuid'])
                        ), z=z, x=x, y=y, color=color, tstamp=tstamp)

                        if color is None:
                            buf = BytesIO()
                            img.save(buf, format='PNG', compress_level=3)

                            tilestor.execute(
                                "DELETE FROM tile WHERE z = ? AND x = ? AND y = ?",
                                (z, x, y))

                            try:
                                tilestor.execute(
                                    "INSERT INTO tile VALUES (?, ?, ?, ?, ?)",
                                    (z, x, y, tstamp, buf.getvalue()))
                            except sqlite3.IntegrityError:
                                # NOTE: Race condition with other proccess may occurs here.
                                # TODO: ON CONFLICT DO ... in SQLite >= 3.24.0 (python 3)
                                pass

                        if 'answer_queue' in data:
                            answers.append(data['answer_queue'])
                        
                        tiles_written += 1

                        ctime = time()
                        time_taken += ctime - ptime

                        if tiles_written >= BATCH_MAX_TILES:
                            # Break the batch
                            data = None
                        else:
                            # Try to get next tile for the batch. Or break
                            # the batch if there is no tiles left.
                            if time_taken < BATCH_DEADLINE:
                                try:
                                    data = self.queue.get(timeout=(
                                        BATCH_DEADLINE - time_taken))
                                except Empty:
                                    data = None
                            else:
                                data = None

                        # Do not account queue block time
                        ptime = time()

                    # Force zope session management to commit changes
                    mark_changed(DBSession())
                    tilestor.commit()

                    time_taken += time() - ptime
                    _logger.debug(
                        "%d tiles were written in %0.3f seconds (%0.3f per "
                        "tile)", tiles_written, time_taken,
                        time_taken / tiles_written)
                    
                # Report about sucess only after transaction commit
                for a in answers:
                    a.put_nowait(None)

            except Exception as exc:
                _logger.exception("Uncaught exception in tile writer: %s", exc.message)


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

    async_writing = False

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
            self._tilestor = get_tile_db(self.tilestor_path)

        return self._tilestor

    @property
    def tilestor_path(self):
        tcpath = env.render.tile_cache_path
        suuid = self.uuid.hex

        return os.path.join(tcpath, suuid[0:2], suuid[2:4], suuid)

    def get_tile(self, tile):
        z, x, y = tile

        conn = DBSession.connection()
        trow = conn.execute(db.sql.text(
            'SELECT color, tstamp '
            'FROM tile_cache."{}" '
            'WHERE z = :z AND x = :x AND y = :y'.format(self.uuid.hex)
        ), z=z, x=x, y=y).fetchone()

        if trow is None:
            return False, None

        color, tstamp = trow

        if self.ttl is not None:
            expdt = TIMESTAMP_EPOCH + timedelta(seconds=tstamp + self.ttl)
            if expdt <= datetime.utcnow():
                return False, None

        if color is not None:
            colors = unpack_color(color)
            if colors[3] == 0:
                return True, None
            return True, Image.new('RGBA', (256, 256), colors)

        else:
            cur = self.tilestor.cursor()
            srow = cur.execute(
                'SELECT data FROM tile WHERE z = ? AND x = ? AND y = ?',
                (z, x, y)).fetchone()

            if srow is None:
                return False, None

            return True, Image.open(BytesIO(srow[0]))

    def put_tile(self, tile, img):
        params = dict(
            tile=tile,
            img=None if img is None else img.copy(),
            uuid=self.uuid.hex,
            db_path=self.tilestor_path
        )

        writer = TilestorWriter.getInstance()

        if self.async_writing:
            answer_queue = Queue(maxsize=1)
            params['answer_queue'] = answer_queue

        try:
            writer.put(params)
        except TileWriterQueueException as exc:
            _logger.error(
                "Failed to put tile {} to tile cache for resource {}. {}"
                .format(params['tile'], self.resource_id, exc.message),
                exc_info=True)

        if self.async_writing:
            try:
                answer_queue.get()
            except Exception:
                pass

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
        with transaction.manager:
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

            zlist = [a[0] for a in conn.execute(query_z).fetchall()]
            for z in zlist:
                aft = affine_bounds_to_tile((srs.minx, srs.miny, srs.maxx, srs.maxy), z)

                xmin, ymax = [int(a) for a in aft * geom.bounds[0:2]]
                xmax, ymin = [int(a) for a in aft * geom.bounds[2:4]]

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
