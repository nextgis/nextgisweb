from sqlalchemy import exists, sql, text

from nextgisweb.env import DBSession, env

from .geometry import Geometry
from .msgspec import Msgspec


def query_unreferenced(Model, column):
    schema = Model.metadata.schema

    # fmt: off
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
        schema=schema if schema is not None else "public",
        table=Model.__tablename__,
        column=column.name
    )):
        db_set.add(row)
    # fmt: on

    sa_set = set()
    metadata = env.metadata()
    for table in metadata.tables.values():
        for fk in table.foreign_keys:
            if (
                fk.column.table.name == Model.__tablename__
                and fk.column.table.schema == schema
                and fk.column.name == Model.id.name
            ):
                sa_set.add(
                    (
                        table.schema if table.schema is not None else "public",
                        table.name,
                        fk.parent.name,
                    )
                )

    if sa_set != db_set:
        raise RuntimeError(
            "Database and SQLAlchemy references mismatch: " "{} != {}".format(db_set, sa_set)
        )

    query = DBSession.query(Model)
    for schema, table, col in db_set:
        c = sql.column(col)
        sql.table(table, c, schema=schema)  # Bind column to table
        query = query.filter(~exists().where(Model.id == c))

    return query
