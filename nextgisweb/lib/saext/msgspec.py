from typing import Type

import sqlalchemy.dialects.postgresql as sa_pg
from msgspec import convert, to_builtins
from sqlalchemy import TypeDecorator


class Msgspec(TypeDecorator):
    impl = sa_pg.JSONB
    cache_ok = True

    def __init__(self, typedef: Type):
        super().__init__()
        self.typedef = typedef

    def process_bind_param(self, value, dialect):
        return to_builtins(value)

    def process_result_value(self, value, dialect):
        return convert(value, self.typedef)

    def copy(self, **kw):
        return Msgspec(self.typedef)
