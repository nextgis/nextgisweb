import os
from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
import transaction
from sqlalchemy.dialects import postgresql, sqlite
from zope.sqlalchemy import mark_changed

from nextgisweb.env import Component, DBSession, _, require
from nextgisweb.lib.config import Option
from nextgisweb.lib.logging import logger

from nextgisweb.core import KindOfData

from .model import TIMESTAMP_EPOCH
from .model import ResourceTileCache as RTC

vacuum_freepage_coeff = 0.5


class TileCacheData(KindOfData):
    identity = "tile_cache"
    display_name = _("Tile cache")


class RenderComponent(Component):
    def initialize(self):
        opt_tcache = self.options.with_prefix("tile_cache")
        self.tile_cache_enabled = opt_tcache["enabled"]
        self.tile_cache_track_changes = opt_tcache["track_changes"]
        self.tile_cache_seed = opt_tcache["seed"]

        self.tile_cache_path = os.path.join(self.env.core.gtsdir(self), "tile_cache")
        if not os.path.isdir(self.tile_cache_path):
            os.makedirs(self.tile_cache_path)

    @require("resource")
    def setup_pyramid(self, config):
        from . import api, view

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    def client_settings(self, request):
        return dict(
            tile_cache=dict(
                enabled=self.tile_cache_enabled,
                track_changes=self.tile_cache_track_changes,
                seed=self.tile_cache_seed,
            )
        )

    def sys_info(self):
        from .imgcodec import has_fpng

        yield ("Fast PNG", _("Enabled") if has_fpng else _("Disabled"))

    def maintenance(self):
        self.cleanup()

    def cleanup(self):
        logger.info("Cleaning up tile cache tables...")

        tile_cache_path = os.path.abspath(self.tile_cache_path)
        deleted_tiles = deleted_files = deleted_tables = 0
        uuid_keep = []
        now_unix = int((datetime.utcnow() - TIMESTAMP_EPOCH).total_seconds())

        # Drop tables and collect tile cache UUIDs that should remain
        with transaction.manager:
            sql_tables = """
                SELECT t.tablename, r.resource_id IS NOT NULL
                FROM pg_catalog.pg_tables t
                LEFT JOIN resource_tile_cache r
                    ON replace(r.uuid::character varying, '-', '') = t.tablename::character varying
                WHERE t.schemaname = 'tile_cache'
            """
            for tablename, exists in DBSession.execute(sa.text(sql_tables)):
                if not exists:
                    DBSession.execute(sa.text('DROP TABLE "tile_cache"."%s"' % tablename))
                    deleted_tables += 1
                else:
                    uuid_keep.append(tablename)

            if deleted_tables > 0:
                mark_changed(DBSession())

        # Clean postgres and sqlite tile records
        with transaction.manager:
            conn_pg = DBSession.connection()

            for tc in RTC.filter(sa.or_(RTC.ttl.isnot(None), RTC.max_z.isnot(None))):
                cond = []
                if tc.max_z is not None:
                    cond.append(sa.column("z") > tc.max_z)
                if tc.ttl is not None:
                    cond.append(sa.column("tstamp") < now_unix - tc.ttl)

                where = sa.or_(*cond)

                def statement(dialect, table, schema=None):
                    table = sa.sql.table(table)
                    table.quote = True
                    if schema is not None:
                        table.schema = schema
                        table.quote_schema = True
                    stmt = table.delete().where(where)
                    return stmt.compile(dialect=dialect, compile_kwargs=dict(literal_binds=True))

                stmt = statement(postgresql.dialect(), tc.uuid.hex, "tile_cache")
                result = conn_pg.execute(stmt)
                deleted_tiles += result.rowcount

                stmt2 = statement(sqlite.dialect(), "tile")
                conn_sqlite, lock = tc.get_tilestor()

                with lock:
                    result = conn_sqlite.execute(str(stmt2))
                    conn_sqlite.commit()
                    deleted_tiles += result.rowcount

                    freelist_count, page_count = conn_sqlite.execute(
                        "SELECT fc.freelist_count, pc.page_count "
                        "FROM pragma_freelist_count fc, pragma_page_count pc;"
                    ).fetchone()

                    if page_count > 0 and (freelist_count / page_count > vacuum_freepage_coeff):
                        logger.info("VACUUM database %s..." % tc.tilestor_path)
                        conn_sqlite.execute("VACUUM;")

            mark_changed(DBSession())

        # Clean file system
        for dirpath, dirnames, filenames in os.walk(tile_cache_path, topdown=False):
            relist = False

            for fn in filenames:
                fullfn = os.path.join(dirpath, fn)
                uuid = fn[:-4] if fn.endswith(("-shm", "-wal")) else fn
                try:
                    UUID(hex=uuid, version=4)
                except ValueError:
                    logger.warning("File {} unrecognized, skipping...".format(fullfn))
                    continue
                if uuid not in uuid_keep and os.stat(fullfn).st_ctime < now_unix:
                    os.remove(fullfn)
                    deleted_files += 1
                    relist = True

            if dirpath != tile_cache_path and (
                (not relist and len(filenames) == 0 and len(dirnames) == 0)
                or len(os.listdir(dirpath)) == 0
            ):
                os.rmdir(dirpath)

        logger.info(
            "Deleted: %d tile records, %d files, %d tables.",
            deleted_tiles,
            deleted_files,
            deleted_tables,
        )

    def backup_configure(self, config):
        super().backup_configure(config)
        config.exclude_table_data("tile_cache", "*")

    def estimate_storage(self):
        for tc in RTC.filter_by(enabled=True).all():
            tilestor, lock = tc.get_tilestor()

            # 16 bytes stand for 4 int columns (z, x, y)
            query_tile = "SELECT coalesce(sum(length(data) + 16), 0) FROM tile"
            size_img = tilestor.execute(query_tile).fetchone()[0]

            query = sa.text('SELECT count(1) FROM tile_cache."{}"'.format(tc.uuid.hex))
            count = DBSession.execute(query).scalar()
            size_color = count * 20  # 5x int columns

            yield TileCacheData, tc.resource_id, size_img + size_color

    option_annotations = (
        Option("check_origin", bool, default=False, doc="Check request Origin header."),
        Option("tile_cache.enabled", bool, default=True),
        Option("tile_cache.track_changes", bool, default=False),
        Option("tile_cache.seed", bool, default=False),
        Option("legend_symbols_section", bool, default=False),
    )
