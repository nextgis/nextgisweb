import warnings
from collections.abc import Sequence
from contextvars import ContextVar
from functools import cache, partial
from importlib.util import find_spec
from pathlib import Path
from typing import Generator

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import BindParameter

current_request = ContextVar("current_request")


def fixture_value(name: str, *alt: str):
    names = (name, *alt)
    request = current_request.get()
    for name in names:
        return request.getfixturevalue(name)
    raise ValueError(f"No fixture found for names: {names}")


def sql_compare(sql, file):
    has_sqlglot = getattr(sql_compare, "has_sqlglot", None)
    if has_sqlglot is None:
        has_sqlglot = find_spec("sqlglot") is not None
        setattr(sql_compare, "has_sqlglot", has_sqlglot)

    if not has_sqlglot:
        pytest.skip("sqlglot not installed")

    from sqlglot import transpile

    sqlglot_kwargs = dict(read="postgres", write="postgres", pretty=True)
    sqlglot_kwargs.update(indent=4, pad=4, normalize_functions=False)
    tr = partial(transpile, **sqlglot_kwargs)

    out = list()
    for s in sql:
        c = _compile_sql(s)
        f = "".join(tr(c))
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
