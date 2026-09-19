from __future__ import annotations

import re
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from functools import cached_property, lru_cache
from textwrap import dedent
from typing import Iterable, Literal
from warnings import warn

import sqlalchemy as sa
from sqlalchemy.schema import CreateTable


class Constr:
    PrimaryKey: Literal["p"] = "p"
    Unique: Literal["u"] = "u"
    ForeignKey: Literal["f"] = "f"
    Check: Literal["c"] = "c"

    All = (PrimaryKey, Unique, ForeignKey, Check)
    Type = Literal["p", "u", "f", "c"]


seq_pattern = re.compile(r"^nextval\('(\w+)'::regclass\)$")


def check_table(
    tab: sa.Table,
    conn: sa.Connection,
    *,
    ihelper: InspectionHelper | None = None,
) -> Iterable[str]:
    ihelper = ihelper or InspectionHelper(conn=conn)

    tab_name, tab_schema = tab.name, tab.schema
    tab_schema_norm = tab_schema if tab_schema else "public"
    tab_name_norm = f"{tab_schema_norm}.{tab_name}"

    tab_repr = (f"{tab_schema}." if tab_schema else "") + tab_name
    tab_msg = f"Table '{tab_repr}'"

    # fmt: off
    table_type = conn.execute(sa.text(dedent("""
        SELECT table_type FROM information_schema.tables
        WHERE table_schema = :schema AND table_name = :name
    """)), dict(schema=tab_schema_norm, name=tab_name)).scalar()
    # fmt: on

    if table_type is None:
        yield f"{tab_msg} not exists."
        return
    if table_type != (exp := "BASE TABLE"):
        yield f"{tab_msg}: type mismatch ({exp} <> {table_type})."
        return

    with _baseline_table(tab, conn=conn) as temp_tab_name_norm:
        # Columns

        # fmt: off
        qcolumns = sa.text(dedent("""
            WITH attr_exp AS (
                SELECT a.attname, a.atttypid, a.atttypmod, a.attnotnull, d.adbin, d.adrelid
                FROM pg_attribute a
                LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
                WHERE a.attrelid = CAST(:temp_name AS regclass) AND attnum > 0 AND NOT attisdropped
            ),
            attr_act AS (
                SELECT a.attname, a.atttypid, a.atttypmod, a.attnotnull, d.adbin, d.adrelid
                FROM pg_attribute a
                LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
                WHERE attrelid = CAST(:name AS regclass) AND attnum > 0 AND NOT attisdropped
            )
            SELECT
                a.attname AS name_exp,
                b.attname AS name_act,
                format_type(a.atttypid, a.atttypmod) AS t_exp,
                format_type(b.atttypid, b.atttypmod) AS t_act,
                a.attnotnull AS notnull_exp,
                b.attnotnull AS notnull_act,
                pg_get_expr(a.adbin, a.adrelid) AS defval_exp,
                pg_get_expr(b.adbin, b.adrelid) AS defval_act
            FROM attr_exp a
            FULL OUTER JOIN attr_act b ON b.attname = a.attname
        """))
        # fmt: on
        result = conn.execute(qcolumns, dict(temp_name=temp_tab_name_norm, name=tab_name_norm))

        col_extra = set()

        for r in result.mappings():
            if r.name_exp is None:
                col_extra.add(r.name_act)
                continue
            col_msg = f"{tab_msg}, column '{r.name_exp}'"
            if r.name_act is None:
                yield f"{col_msg}: not found."
                continue

            if r.t_exp != r.t_act:
                yield f"{col_msg}: type mismatch ({r.t_exp} <> {r.t_act})."

            if r.notnull_exp is not r.notnull_act:
                yield f"{col_msg}: {'should' if r.notnull_exp else 'should not'} be nullable."

            if (
                defval_exp := seq_pattern.sub(
                    lambda m: f"nextval('{tab_schema_norm}.{m.group(1)}'::regclass)",
                    r.defval_exp,
                )
                if r.defval_exp is not None
                else None
            ) != r.defval_act:
                yield f"{col_msg}: default mismatch ({defval_exp} <> {r.defval_act})."

        if len(col_extra) > 0:
            yield f"{tab_msg}: extra columns found ({', '.join(col_extra)})."

        # Constraints

        # fmt: off
        qconstraints = sa.text(dedent("""
            SELECT
                contype,
                conkey,
                conrelid,
                confrelid,
                confkey,
                pg_get_expr(conbin, conrelid) AS expr,
                conname,
                condeferrable,
                condeferred
            FROM pg_constraint
            WHERE conrelid = CAST(:name AS regclass)
        """))
        # fmt: on

        result_exp = conn.execute(qconstraints, dict(name=temp_tab_name_norm))
        result_act = conn.execute(qconstraints, dict(name=tab_name_norm))
        data_exp = _group_constraints(result_exp, ihelper=ihelper)
        data_act = _group_constraints(result_act, ihelper=ihelper)

        # Add foreign key expected data

        fk_data = data_exp.setdefault("f", {})
        tab_relid = ihelper.toid(tab_name_norm)
        for fk in tab.foreign_key_constraints:
            ftab = fk.referred_table
            ftab_name_norm = (f"{ftab.schema}" if ftab.schema else "public") + "." + ftab.name
            ftab_relid = ihelper.toid(ftab_name_norm)

            colnames = tuple(c.name for c in fk.columns)
            fcolnames = tuple(e.column.name for e in fk.elements)

            key = (
                colnames,
                ftab_relid if ftab_relid != tab_relid else None,
                fcolnames,
            )

            fk_data[key] = ConstraintInfo(
                name=fk.name if isinstance(fk.name, str) else ihelper.fk_name(tab.name, colnames),
                deferrable=fk.deferrable is True,
                deferred=(fk.initially or "").upper() == "DEFERRED",
            )

        # Compare constraints

        for contype in Constr.All:

            def conlabel(key: tuple) -> str:
                match contype:
                    case Constr.PrimaryKey | Constr.Unique:
                        fmtcols = ", ".join(key)
                        return f"{'unique' if contype == Constr.Unique else 'primary key'} constraint for column(s) ({fmtcols})"
                    case Constr.ForeignKey:
                        columns, ft_oid, fcolumns = key
                        ft_name = ihelper.tname(ft_oid)
                        fmtcols = ", ".join(columns)
                        fmtfcols = ", ".join(fcolumns)
                        return f"foreign key constraint from '{tab_name}' ({fmtcols}) to '{ft_name}' ({fmtfcols})"
                    case Constr.Check:
                        return f"check constraint ({key})"
                raise NotImplementedError

            cdata_exp = data_exp.get(contype, dict())
            cdata_act = data_act.get(contype, dict())
            for key, d_exp in cdata_exp.items():
                if (d_act := cdata_act.pop(key, None)) is None:
                    yield f"{tab_msg}, {conlabel(key)} not found."
                    continue

                if d_exp.duplicate:
                    yield f"{tab_msg}, {conlabel(key)} has duplicates."

                if d_exp.name is not None and d_exp.name != d_act.name:
                    yield f"{tab_msg}, {conlabel(key)} name mismatch ({d_exp.name} <> {d_act.name})."

                if d_exp.deferrable != d_act.deferrable:
                    yield f"{tab_msg}, {conlabel(key)} {'should' if d_exp.deferrable else 'should not'} be deferrable."

                if d_exp.deferred != d_act.deferred:
                    yield f"{tab_msg}, {conlabel(key)} {'should' if d_exp.deferred else 'should not'} be deferred."

            for key in cdata_act.keys():
                yield f"{tab_msg}: extra constraint found ({conlabel(key)})."


@contextmanager
def _baseline_table(table: sa.Table, *, conn: sa.Connection) -> Iterator[str]:
    # Setting schema to "pg_temp" is equivalent of creating a TEMPORARY table
    clone = table.to_metadata(sa.MetaData(), schema="pg_temp")
    conn.execute(CreateTable(clone, include_foreign_key_constraints=[]))

    with conn.begin_nested() as savepoint:
        try:
            # This search path manipulation is required to handle `nextval`
            # defaults with sequences which aren't owned by the table.
            conn.execute(sa.text("SELECT set_config('search_path', '', true)"))

            # TODO: Handle quoting in table names, but for now we assume that
            # our table names don't require quoting.
            yield f"pg_temp.{clone.name}"
        finally:
            # Clean up the temporary table and restore the search path
            savepoint.rollback()


class InspectionHelper:
    def __init__(self, conn: sa.Connection) -> None:
        self._conn = conn
        self.colname = lru_cache(self._colname)
        self.tname = self._tname  # No caching!
        self.toid = lru_cache(self._toid)

    def colnames(self, toid: int, keys: Iterable[int]) -> tuple[str, ...]:
        return tuple(self.colname(toid, k) for k in keys)

    @cached_property
    def max_identifier_length(self) -> int:
        value = self._conn.execute(sa.text("SHOW max_identifier_length")).scalar()
        return int(value)

    def fk_name(self, table_name: str, columns: Iterable[str]) -> str | None:
        result = f"{table_name}_{'_'.join(columns)}_fkey"
        limit = self.max_identifier_length
        if len(result) > limit:
            warn(
                f"Autogenerated foreign key name '{result}' exceeds the limit ({limit}) and will "
                f"not be checked. Set the foreign key name explicitly.",
                category=UserWarning,
            )
            return None
        return result

    _colname_query = sa.text(
        "SELECT attname FROM pg_attribute "
        "WHERE attrelid = :toid AND attnum = :attnum AND NOT attisdropped"
    )

    def _colname(self, toid: int, key: int) -> str:
        result = self._conn.execute(
            self._colname_query,
            dict(toid=toid, attnum=key),
        ).scalar()
        assert result is not None
        return result

    _tname_query = sa.text("SELECT CAST(:oid AS regclass)")

    def _tname(self, oid: int) -> str:
        return self._conn.execute(self._tname_query, dict(oid=oid)).scalar()

    _toid_query = sa.text("SELECT CAST(:name AS regclass)::oid")

    def _toid(self, name: str) -> int:
        return self._conn.execute(self._toid_query, dict(name=name)).scalar()


_conmap: dict[Constr.Type, Callable[[sa.RowMapping, InspectionHelper], tuple]] = {
    Constr.PrimaryKey: lambda row, icache: icache.colnames(row.conrelid, row.conkey),
    Constr.Unique: lambda row, icache: icache.colnames(row.conrelid, row.conkey),
    Constr.ForeignKey: lambda row, icache: (
        icache.colnames(row.conrelid, row.conkey),
        row.confrelid if row.confrelid != row.conrelid else None,  # Check self-relation
        icache.colnames(row.confrelid, row.confkey),
    ),
    Constr.Check: lambda row, icache: row.expr,
}


@dataclass(kw_only=True)
class ConstraintInfo:
    name: str | None
    deferrable: bool
    deferred: bool
    duplicate: bool = False


ConstraintsGrouped = dict[Constr.Type, dict[tuple, ConstraintInfo]]


def _group_constraints(qresult: sa.Result, *, ihelper: InspectionHelper) -> ConstraintsGrouped:
    result: ConstraintsGrouped = {}
    for row in qresult.mappings():
        cmpfun = _conmap.get(row.contype)
        if cmpfun is None:
            continue  # Skip unknown constraint types

        if (group := result.get(row.contype)) is None:
            group: dict[tuple, ConstraintInfo] = {}
            result[row.contype] = group

        key = cmpfun(row, ihelper)
        if (existing := group.get(key)) is not None:
            existing.duplicate = True
        else:
            group[key] = ConstraintInfo(
                name=row.conname,
                deferrable=row.condeferrable,
                deferred=row.condeferred,
            )
    return result
