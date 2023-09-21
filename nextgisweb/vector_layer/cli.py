from sqlalchemy.sql import text as literal_sql

from nextgisweb.env import DBSession
from nextgisweb.env.cli import DryRunOptions, EnvCommand, cli, opt
from nextgisweb.lib.logging import logger

from .model import SCHEMA


@cli.group()
class vector_layer:
    pass


@vector_layer.command()
class cleanup_orphaned_tables(DryRunOptions, EnvCommand):
    one_per_txn: bool = opt(False, doc="Drop one table per transaction")

    def __call__(self):
        con = DBSession.connection()

        regexp = r"^layer_[0-9a-f]{32}$"

        base_query = """
            SELECT t.table_name, v.id, (v.id IS NULL) AS orphan
            FROM information_schema.tables t
            LEFT JOIN public.vector_layer v ON 'layer_' || v.tbl_uuid = t.table_name
            WHERE t.table_schema = :schema AND t.table_name ~ :regexp
        """

        total, orphan = con.execute(
            literal_sql(
                """
            SELECT COUNT(*), COUNT(*) - COUNT(base.id)
            FROM ( %s ) base
        """
                % base_query
            ),
            dict(schema=SCHEMA, regexp=regexp),
        ).fetchone()

        logger.info(
            "%d tables found, %d orphan (schema = '%s', regexp = '%s')",
            total,
            orphan,
            SCHEMA,
            regexp,
        )

        result = con.execute(
            literal_sql(
                """
            SELECT base.table_name, base.id
            FROM ( %s ) base
            WHERE base.orphan
        """
                % base_query
            ),
            dict(schema=SCHEMA, regexp=regexp),
        )

        if self.dry_run:
            return

        if not self.one_per_txn:
            con.execute(literal_sql("BEGIN"))

        count = 0
        try:
            for row in result:
                if self.one_per_txn:
                    con.execute(literal_sql("BEGIN"))

                if row["id"] is not None:
                    raise ValueError("Resource id should be empty!")

                drop_query = literal_sql('DROP TABLE "%s"."%s"' % (SCHEMA, row["table_name"]))
                logger.debug(drop_query)
                con.execute(drop_query)

                if self.one_per_txn:
                    con.execute(literal_sql("COMMIT"))

                count += 1
        except Exception:
            con.execute(literal_sql("ROLLBACK"))
            raise
        else:
            if not self.one_per_txn:
                con.execute(literal_sql("COMMIT"))
        finally:
            logger.info("%d orphaned tables deleted", count)
