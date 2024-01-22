from sqlalchemy.types import UserDefinedType


class Geometry(UserDefinedType):
    cache_ok = True

    def __init__(self, geometry_type: str, srid: int):
        self.geometry_type = geometry_type
        self.srid = srid

    def get_col_spec(self):
        return f"GEOMETRY({self.geometry_type}, {self.srid})"
