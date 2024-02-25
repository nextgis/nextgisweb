from functools import partial
from importlib.util import find_spec

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import BindParameter

from nextgisweb.env.package import pkginfo


def pytest_addoption(parser):
    parser.addoption(
        "--ngw-update-refs",
        action="store_true",
        default=False,
        help="Update reference data, like SQL queries",
    )


@pytest.fixture(autouse=True)
def ngw_skip_disabled_component(request):
    if "ngw_env" in request.fixturenames:
        ngw_env = request.getfixturevalue("ngw_env")
        comp = pkginfo.component_by_module(request.module.__name__)
        if comp and comp not in ngw_env.components:
            pytest.skip(f"{comp} disabled")


def _env_initialize():
    from ..environment import Env, env

    result = env()
    if result:
        return result
    result = Env(initialize=True, set_global=True)
    result.running_tests = True
    return result


@pytest.fixture(scope="session")
def ngw_env():
    return _env_initialize()


@pytest.fixture(scope="module")
def ngw_data_path(request):
    parent = request.path.parent
    assert parent.name == "test"
    result = parent / "data"
    assert result.is_dir()
    yield result


@pytest.fixture(scope="session", autouse=True)
def ngw_sql_compare(request):
    update_refs = request.config.getoption("--ngw-update-refs")
    setattr(sql_compare, "update", update_refs)


def sql_compare(sql, file):
    has_sqlglot = getattr(sql_compare, "has_sqlglot", None)
    if has_sqlglot is None:
        has_sqlglot = find_spec("sqlglot") is not None
        setattr(sql_compare, "has_sqlglot", has_sqlglot)

    if not has_sqlglot:
        pytest.skip("sqlglot not installed")

    from sqlglot import ParseError, transpile

    sqlglot_kwargs = dict(read="postgres", write="postgres", pretty=True)
    sqlglot_kwargs.update(indent=4, pad=4, normalize_functions=False)
    tr = partial(transpile, **sqlglot_kwargs)

    out = list()
    for s in sql:
        c = _compile_sql(s)
        try:
            f = "".join(tr(c))
        except ParseError:
            # The INCLUDE and EXCLUDE keywords for indexes are not supported:
            # https://github.com/tobymao/sqlglot/issues/2855
            f = c.replace("\t", "    ")
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
