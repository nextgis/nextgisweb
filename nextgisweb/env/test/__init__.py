import re
import warnings
from collections.abc import Sequence
from contextvars import ContextVar
from functools import cache, partial
from importlib.util import find_spec
from pathlib import Path

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import BindParameter
from sqlglot.dialects.postgres import Postgres as SqlglotPostgres

current_request = ContextVar("current_request")


def fixture_value(name: str, *alt: str):
    names = (name, *alt)
    request = current_request.get()
    for name in names:
        return request.getfixturevalue(name)
    raise ValueError(f"No fixture found for names: {names}")


@cache
def get_sqlglot_transpile():
    if find_spec("sqlglot") is None:

        def _transpile(*args, **kwargs):
            pytest.skip("sqlglot not installed")

        return _transpile

    from sqlglot import transpile
    from sqlglot.dialects.postgres import Postgres, PostgresGenerator
    from sqlglot.expressions import Reference, UniqueColumnConstraint

    param_re, param_repl = re.compile(r"^%\((.*)\)s$"), r":\1"

    class Dialect(Postgres):
        class Generator(PostgresGenerator):
            def placeholder_sql(self, expression):
                result = super().placeholder_sql(expression)
                return param_re.sub(param_repl, result)

            def schema_columns_sql(self, expression) -> str:
                if isinstance(expression.parent, (UniqueColumnConstraint, Reference)):
                    columns = self.expressions(expression, flat=True)
                    return f"({columns})"
                return super().schema_columns_sql(expression)

    sqlglot_kwargs = dict(read="postgres", write=Dialect, pretty=True)
    sqlglot_kwargs.update(indent=4, pad=4, normalize_functions=False)

    return partial(transpile, **sqlglot_kwargs)


def sql_compare(sql, file):
    transpile = get_sqlglot_transpile()

    out = list()
    for s in sql:
        c = _compile_sql(s)
        f = ";\n\n".join(transpile(c))
        out.append(f.strip(" \n") + ";\n")

    norm_sql = "\n".join(out)

    update = sql_compare.update
    if update or not file.exists():
        file.write_text(norm_sql)
    else:
        ref_sql = file.read_text()
        assert ref_sql == norm_sql, "SQL mismatch, use --ngw-update-refs to update"


pg_dialect = postgresql.dialect()


@compiles(BindParameter)
def _compile_bindparam(element, compiler, **kwargs):
    if not getattr(_compile_bindparam, "enabled", False):
        return compiler.visit_bindparam(element, **kwargs)
    return f":{element.key}"


def _compile_sql(expr):
    try:
        setattr(_compile_bindparam, "enabled", True)
        return str(expr.compile(dialect=pg_dialect))
    finally:
        setattr(_compile_bindparam, "enabled", False)


def __getattr__(name: str):
    match name:
        case "_env":
            from nextgisweb.pytest.env import _env as v
        case _:
            raise AttributeError
    warnings.warn(
        f"Importing '{name}' from {__name__} is deprecated",
        DeprecationWarning,
        stacklevel=2,
    )
    return v
