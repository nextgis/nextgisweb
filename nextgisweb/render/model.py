import atexit
import os.path
import sqlite3
from datetime import datetime, timedelta
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from queue import Empty, Full, Queue
from threading import Lock, Thread
from time import time
from typing import Any, Union
from uuid import uuid4

import sqlalchemy as sa
import sqlalchemy.event as sa_event
import sqlalchemy.orm as orm
import transaction
from PIL import Image
from sqlalchemy import MetaData, Table
from zope.sqlalchemy import mark_changed

from nextgisweb.env import Base, DBSession, env
from nextgisweb.lib import saext
from nextgisweb.lib.logging import logger

from nextgisweb.resource import CRUTypes, Resource, ResourceScope, SAttribute, Serializer

from .interface import IRenderableNonCached, IRenderableStyle
from .util import TILE_SIZE, imgcolor, pack_color, unpack_color

Base.depends_on("resource")

TIMESTAMP_EPOCH = datetime(year=1970, month=1, day=1)

QUEUE_MAX_SIZE = 256
QUEUE_STUCK_TIMEOUT = 5.0
BATCH_MAX_TILES = 32
BATCH_DEADLINE = 0.5
SHUTDOWN_TIMEOUT = 10

SQLITE_CON_CACHE = 32
SQLITE_TIMEOUT = min(QUEUE_STUCK_TIMEOUT * 2, 30)


@lru_cache(SQLITE_CON_CACHE)
def get_tile_db(db_path):
    p = Path(db_path)
    if not p.parent.exists():
        p.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(
        db_path, isolation_level="DEFERRED", timeout=SQLITE_TIMEOUT, check_same_thread=False
    )

    connection.text_factory = bytes
    cur = connection.cursor()

    # Set page size according to https://www.sqlite.org/intern-v-extern-blob.html
    cur.execute("PRAGMA page_size = 8192")

    # For better concurency and avoiding lock timeout errors during reading:
    cur.execute("PRAGMA journal_mode = WAL")

    # CREATE TABLE IF NOT EXISTS causes SQLite database lock. So check the tile
    # table existance before table creation.
    # fmt: off
    table_exists = (cur.execute("""
        SELECT 1 FROM sqlite_master
        WHERE type='table' AND name='tile'
    """).fetchone() is not None)
    # fmt: on

    if not table_exists:
        # fmt: off
        cur.execute("""
            CREATE TABLE IF NOT EXISTS tile (
                z INTEGER, x INTEGER, y INTEGER,
                tstamp INTEGER NOT NULL,
                data BLOB NOT NULL,
                PRIMARY KEY (z, x, y)
            )
        """)
        # fmt: on

        connection.commit()

    return connection, Lock()


class TileWriterQueueException(Exception):
    pass


class TileWriterQueueFullException(TileWriterQueueException):
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

    @classmethod
    def getInstance(cls):
        if cls.__instance is None:
            cls.__instance = TilestorWriter()
        return cls.__instance

    def put(self, payload, timeout):
        try:
            if timeout is None:
                self.queue.put_nowait(payload)
            else:
                self.queue.put(payload, timeout=timeout)
        except Full:
            raise TileWriterQueueFullException(
                "Tile writer queue is full at maxsize {}.".format(self.queue.maxsize)
            )

    def _job(self):
        self._shutdown = False
        atexit.register(self.wait_for_shutdown)

        data = None
        tilestor = None
        while True:
            self.cstart = None

            if data is None:
                try:
                    # When the thread is shutting down use minimal timeout
                    # otherwise use a big timeout not to block shutdown
                    # that may happen.
                    get_timeout = 0.001 if self._shutdown else min(SHUTDOWN_TIMEOUT / 5, 2)
                    data = self.queue.get(True, get_timeout)
                except Empty:
                    if self._shutdown:
                        logger.debug("Tile cache writer queue is empty now. Exiting!")
                        break
                    else:
                        continue

            db_path = data["db_path"]

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
                    tilestor, lock = get_tile_db(db_path)

                    while data is not None and data["db_path"] == db_path:
                        z, x, y = data["tile"]
                        tstamp = int((datetime.utcnow() - TIMESTAMP_EPOCH).total_seconds())

                        img = data["img"]
                        if img is not None and img.mode != "RGBA":
                            img = img.convert("RGBA")

                        colortuple = imgcolor(img)
                        color = pack_color(colortuple) if colortuple is not None else None

                        self._write_tile_meta(
                            conn, data["uuid"], dict(z=z, x=x, y=y, color=color, tstamp=tstamp)
                        )

                        if color is None:
                            buf = BytesIO()
                            img.save(buf, format="PNG", compress_level=3)
                            value = buf.getvalue()

                            with lock:
                                self._write_tile_data(tilestor, z, x, y, tstamp, value)

                        if "answer_queue" in data:
                            answers.append(data["answer_queue"])

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
                                    data = self.queue.get(timeout=(BATCH_DEADLINE - time_taken))
                                except Empty:
                                    data = None
                            else:
                                data = None

                        # Do not account queue block time
                        ptime = time()

                    # Force zope session management to commit changes
                    mark_changed(DBSession())
                    tilestor.commit()
                    tilestor = None

                    time_taken += time() - ptime
                    logger.debug(
                        "%d tiles were written in %0.3f seconds (%0.1f per " "second, qsize = %d)",
                        tiles_written,
                        time_taken,
                        tiles_written / time_taken,
                        self.queue.qsize(),
                    )

                # Report about sucess only after transaction commit
                for a in answers:
                    a.put_nowait(None)

            except Exception:
                logger.exception("Uncaught exception in tile cache writer")

                data = None
                self.cstart = None
                if tilestor is not None:
                    tilestor.rollback()

    def _write_tile_meta(self, conn, table_uuid, row):
        # fmt: off
        conn.execute(sa.sql.text("""
            INSERT INTO tile_cache."{0}" AS tc (z, x, y, color, tstamp)
            VALUES (:z, :x, :y, :color, :tstamp)
            ON CONFLICT (z, x, y) DO UPDATE
            SET color = :color, tstamp = :tstamp
            WHERE tc.tstamp < :tstamp
        """.format(table_uuid)), row)
        # fmt: on

    def _write_tile_data(self, tilestor, z, x, y, tstamp, value):
        # fmt: off
        tilestor.execute("""
            INSERT INTO tile VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (z, x, y) DO UPDATE
            SET tstamp = ?, data = ?
            WHERE tstamp < ?
        """, (z, x, y, tstamp, value, tstamp, value, tstamp))
        # fmt: on

    def wait_for_shutdown(self, timeout=SHUTDOWN_TIMEOUT):
        if not self._worker.is_alive():
            return True

        logger.debug(
            "Waiting for shutdown of tile cache writer for %d seconds " "(qsize = %d)...",
            timeout,
            self.queue.qsize(),
        )

        self._shutdown = True
        self._worker.join(timeout)

        if self._worker.is_alive():
            logger.warning("Tile cache writer is still running. It'll be killed!")
            return False
        else:
            logger.debug("Tile cache writer has successfully shut down.")
            return True


class ResourceTileCache(Base):
    __tablename__ = "resource_tile_cache"

    EXPRIRES_MAX = 2147483647

    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)
    uuid = sa.Column(saext.UUID, nullable=False)
    enabled = sa.Column(sa.Boolean, nullable=False, default=False)
    image_compose = sa.Column(sa.Boolean, nullable=False, default=False)
    max_z = sa.Column(sa.SmallInteger)
    ttl = sa.Column(sa.Integer)

    async_writing = False

    resource = orm.relationship(
        Resource,
        backref=orm.backref(
            "tile_cache",
            uselist=False,
            cascade="all, delete-orphan",
            cascade_backrefs=False,
        ),
    )

    def __init__(self, *args, **kwagrs):
        if "uuid" not in kwagrs:
            kwagrs["uuid"] = uuid4()
        self.reconstructor()
        super().__init__(*args, **kwagrs)

    @orm.reconstructor
    def reconstructor(self):
        self._sameta = None
        self._tiletab = None
        self._tilestor = None

    def init_metadata(self):
        self._sameta = MetaData(schema="tile_cache")
        self._tiletab = Table(
            self.uuid.hex,
            self._sameta,
            sa.Column("z", sa.SmallInteger, primary_key=True),
            sa.Column("x", sa.Integer, primary_key=True),
            sa.Column("y", sa.Integer, primary_key=True),
            sa.Column("color", sa.Integer),
            # We don't need subsecond resolution which TIMESTAMP provides, so
            # use 4-byte INTEGER type. Say hello to 2038-year problem!
            sa.Column("tstamp", sa.Integer, nullable=False),
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

    def get_tilestor(self):
        if self._tilestor is None:
            self._tilestor, self._lock = get_tile_db(self.tilestor_path)

        return self._tilestor, self._lock

    @property
    def tilestor_path(self):
        tcpath = env.render.tile_cache_path
        suuid = self.uuid.hex

        return os.path.join(tcpath, suuid[0:2], suuid[2:4], suuid)

    def get_tile(self, tile):
        z, x, y = tile

        conn = DBSession.connection()
        trow = conn.execute(
            sa.sql.text(
                "SELECT color, tstamp "
                'FROM tile_cache."{}" '
                "WHERE z = :z AND x = :x AND y = :y".format(self.uuid.hex)
            ),
            dict(z=z, x=x, y=y),
        ).fetchone()

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
            return True, Image.new("RGBA", (TILE_SIZE, TILE_SIZE), colors)

        else:
            tilestor, lock = self.get_tilestor()
            with lock:
                srow = tilestor.execute(
                    "SELECT data FROM tile WHERE z = ? AND x = ? AND y = ?",
                    (z, x, y),
                ).fetchone()

            if srow is None:
                return False, None

            return True, Image.open(BytesIO(srow[0]))

    def put_tile(self, tile, img, timeout=None):
        params = dict(
            tile=tile,
            img=None if img is None else img.copy(),
            uuid=self.uuid.hex,
            db_path=self.tilestor_path,
        )

        writer = TilestorWriter.getInstance()

        if self.async_writing:
            answer_queue = Queue(maxsize=1)
            params["answer_queue"] = answer_queue

        result = None
        try:
            writer.put(params, timeout)
            result = True
        except TileWriterQueueException as exc:
            result = False
            logger.error(
                "Failed to put tile {} to tile cache for resource {}. {}".format(
                    params["tile"], self.resource_id, exc
                ),
                exc_info=True,
            )

        if self.async_writing:
            try:
                answer_queue.get()
            except Exception:
                pass

        return result

    def initialize(self):
        self.sameta.create_all(bind=DBSession.connection())

    def clear(self):
        """Clear tile cache and remove all tiles"""
        self._sameta = None
        self._tiletab = None
        self._tilestor = None
        self.uuid = uuid4()
        self.initialize()


sa_event.listen(
    ResourceTileCache.__table__,
    "after_create",
    sa.DDL("CREATE SCHEMA IF NOT EXISTS tile_cache"),
    propagate=True,
)

sa_event.listen(
    ResourceTileCache.__table__,
    "after_drop",
    sa.DDL("DROP SCHEMA IF EXISTS tile_cache CASCADE"),
    propagate=True,
)


class TileCacheFlushAttr(SAttribute):
    def set(self, srlzr: Serializer, value: Union[bool, None], *, create: bool):
        if value and srlzr.obj.tile_cache is not None:
            srlzr.obj.tile_cache.clear()


class TileCacheAttr(SAttribute):
    def bind(self, srlzrcls, attrname):
        assert not self.required
        self.column = column = getattr(ResourceTileCache, attrname)
        self.default = column.default.arg if column.default is not None else None
        super().bind(srlzrcls, attrname)

    def setup_types(self):
        if self.ctypes is not None:
            self.types = self.ctypes
        else:
            type = self.column.type.python_type
            assert type in (int, bool)
            if self.column.nullable:
                type = Union[type, None]
            self.types = CRUTypes(type, type, type)

    def get(self, srlzr: Serializer) -> Any:
        if not env.render.tile_cache_enabled or srlzr.obj.tile_cache is None:
            return self.default
        return getattr(srlzr.obj.tile_cache, self.model_attr)

    def set(self, srlzr: Serializer, value: Any, *, create: bool):
        if value != self.default or srlzr.obj.tile_cache is not None:
            if srlzr.obj.tile_cache is None:
                srlzr.obj.tile_cache = ResourceTileCache()
            setattr(srlzr.obj.tile_cache, self.model_attr, value)


class TileCacheSerializer(Serializer, resource=Resource):
    identity = "tile_cache"

    # NOTE: Flush property should be deserialized at first!
    flush = TileCacheFlushAttr(read=None, write=ResourceScope.update)

    enabled = TileCacheAttr(read=ResourceScope.read, write=ResourceScope.update)
    image_compose = TileCacheAttr(read=ResourceScope.read, write=ResourceScope.update)
    max_z = TileCacheAttr(read=ResourceScope.read, write=ResourceScope.update)
    ttl = TileCacheAttr(read=ResourceScope.read, write=ResourceScope.update)

    def is_applicable(self):
        return IRenderableStyle.providedBy(self.obj) and not IRenderableNonCached.providedBy(
            self.obj
        )

    def deserialize(self):
        super().deserialize()

        if self.obj.tile_cache is not None:
            self.obj.tile_cache.initialize()
