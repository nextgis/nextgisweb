import transaction
from sqlalchemy import exists, sql, text

from nextgisweb.env import Component, DBSession
from nextgisweb.lib.logging import logger

from .model import SLD


class SLDComponent(Component):

    def cleanup(self, *, dry_run):
        schema = SLD.metadata.schema

        db_set = set()
        for row in DBSession.execute(text("""
            SELECT kcu.table_schema, kcu.table_name, kcu.column_name
            FROM information_schema.constraint_column_usage ccu
            INNER JOIN information_schema.table_constraints tc ON
                tc.constraint_name = ccu.constraint_name
                AND tc.constraint_type = 'FOREIGN KEY'
            INNER JOIN information_schema.key_column_usage kcu ON
                kcu.constraint_name = ccu.constraint_name
                AND kcu.table_schema = tc.table_schema
                AND kcu.table_name = tc.table_name
            WHERE
                ccu.table_schema = :schema
                AND ccu.table_name = :table
                AND ccu.column_name = :column
        """), dict(
            schema=schema if schema is not None else 'public',
            table=SLD.__tablename__,
            column=SLD.id.name
        )):
            db_set.add(row)

        sa_set = set()
        metadata = self.env.metadata()
        for table in metadata.tables.values():
            for fk in table.foreign_keys:
                if (
                    fk.column.table.name == SLD.__tablename__
                    and fk.column.table.schema == schema
                    and fk.column.name == SLD.id.name
                ):
                    sa_set.add((
                        table.schema if table.schema is not None else 'public',
                        table.name, fk.parent.name))

        if sa_set != db_set:
            raise RuntimeError(
                "FileObj DB and SQLAlchemy references mismatch: "
                "{} != {}".format(db_set, sa_set))

        q = DBSession.query(SLD)
        for schema, table, column in db_set:
            c = sql.column(column)
            sql.table(table, c, schema=schema)
            q = q.filter(~exists().where(SLD.id == c))

        if dry_run:
            records = q.count()
        else:
            with transaction.manager:
                records = q.delete(synchronize_session=False)

        logger.info("%d unreferenced file records found", records)
