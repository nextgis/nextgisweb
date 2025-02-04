from typing import Type

import sqlalchemy.dialects.postgresql as sa_pg
from msgspec import convert, to_builtins
from sqlalchemy import TypeDecorator, null


class Msgspec(TypeDecorator):
    impl = sa_pg.JSONB
    cache_ok = True

    def __init__(self, typedef: Type):
        super().__init__()
        self.typedef = typedef

    def process_bind_param(self, value, dialect):
        if value is None:
            return null()
        return to_builtins(value)

    def process_result_value(self, value, dialect):
        if value is not None:
            return convert(value, self.typedef)

    def copy(self, **kw):
        return Msgspec(self.typedef)
