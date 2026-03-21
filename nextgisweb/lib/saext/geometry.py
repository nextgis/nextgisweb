import shapely.wkb
from sqlalchemy import func
from sqlalchemy.dialects.postgresql.base import PGDialect
from sqlalchemy.types import UserDefinedType


class Geometry(UserDefinedType):
    cache_ok = True

    def __init__(self, geometry_type: str, srid: int):
        self.geometry_type = geometry_type
        self.srid = srid

    def get_col_spec(self):
        return f"GEOMETRY({self.geometry_type}, {self.srid})"

    def bind_expression(self, bindvalue):
        return func.ST_GeomFromEWKT(bindvalue)

    def bind_processor(self, dialect):
        srid = self.srid

        def process(value):
            if value is None:
                return None
            if isinstance(value, (bytes, bytearray)):
                geom = shapely.wkb.loads(bytes(value))
                return f"SRID={srid};{geom.wkt}"
            if isinstance(value, str) and value.upper().startswith("SRID="):
                return value
            return f"SRID={srid};{value}"

        return process


def _geometry_from_reflection(*args, **kw):
    if len(args) == 2:
        try:
            return Geometry(str(args[0]).upper(), int(args[1]))
        except (ValueError, TypeError):
            pass
    return Geometry("GEOMETRY", 0)


PGDialect.ischema_names["geometry"] = _geometry_from_reflection
