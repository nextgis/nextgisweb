from sqlalchemy.dialects.postgresql import dialect as pg_dialect

from ..lib.i18n import trstr_factory

COMP_ID = 'postgis'
_ = trstr_factory(COMP_ID)


def coltype_as_str(coltype):
    return coltype.compile(pg_dialect())
