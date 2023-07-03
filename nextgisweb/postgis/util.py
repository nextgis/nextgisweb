from sqlalchemy.dialects.postgresql import dialect as pg_dialect


def coltype_as_str(coltype):
    return coltype.compile(pg_dialect())
