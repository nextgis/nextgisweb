import re
from functools import cache
from typing import Iterable

import sqlalchemy as sa
from sqlalchemy.schema import CreateTable

from nextgisweb.env import DBSession

prefix = "temp_"
seq_pattern = re.compile(rf"^nextval\('{prefix}(\w+)'::regclass\)$")


def check_table(tab: sa.Table) -> Iterable[str]:
    tab_name, tab_schema = tab.name, tab.schema
    tab_repr = (f"{tab_schema}." if tab_schema else "") + tab_name
    tab_msg = f"Table '{tab_repr}'"

    temp_tab = tab.to_metadata(
        tab.metadata,
        name=prefix + tab_name,
    )

    for constraint in temp_tab.constraints:
        if constraint.name is not None:
            constraint.name = prefix + constraint.name

    DBSession.execute(CreateTable(temp_tab))

    # Columns

    qcolumns = sa.text("""
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
""")
    result = DBSession.execute(qcolumns, dict(temp_name=temp_tab.name, name=tab_name))

    col_extra = set()

    for r in result.mappings():
        if r.name_exp is None:
            col_extra.add(r.name_act)
            continue
        col_msg = f"{tab_msg}, column '{r.name_exp}'"
        if r.name_act is None:
            yield f"{col_msg}: not found."
        elif r.t_exp != r.t_act:
            yield f"{col_msg}: type mismatch ({r.t_exp} <> {r.t_act})."
        elif r.notnull_exp is not r.notnull_act:
            yield f"{col_msg}: {'should' if r.notnull_exp else 'should not'} be nullable."
        elif (
            defval_exp := seq_pattern.sub(
                lambda m: f"nextval('{m.group(1)}'::regclass)", r.defval_exp
            )
            if r.defval_exp is not None
            else None
        ) != r.defval_act:
            yield f"{col_msg}: default mismatch ({defval_exp} <> {r.defval_act})."

    if len(col_extra) > 0:
        yield f"{tab_msg}: extra columns found ({', '.join(col_extra)})."

    # Constraints

    qconstraints = sa.text("""
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
""")
    result_exp = DBSession.execute(qconstraints, dict(name=temp_tab.name))
    result_act = DBSession.execute(qconstraints, dict(name=tab_name))
    data_exp = _group_constraints(result_exp)
    data_act = _group_constraints(result_act)

    for contype in ("p", "u", "f", "c"):

        def conlabel(key):
            match contype:
                case "p" | "u":
                    fmtcols = ", ".join(key)
                    return f"{'unique' if contype == 'u' else 'primary key'} constraint for column(s) ({fmtcols})"
                case "f":
                    columns, ft_oid, fcolumns = key
                    ft_name = _tname(ft_oid)
                    fmtcols = ", ".join(columns)
                    fmtfcols = ", ".join(fcolumns)
                    return f"foreign key constraint from '{tab_name}' ({fmtcols}) to '{ft_name}' ({fmtfcols})"
                case "c":
                    return f"check constraint ({key})"
            raise NotImplementedError

        cdata_exp = data_exp.get(contype, dict())
        cdata_act = data_act.get(contype, dict())
        for key, d_exp in cdata_exp.items():
            if key not in cdata_act:
                yield f"{tab_msg}, {conlabel(key)} not found."
                continue
            d_act = cdata_act.pop(key)
            if (
                name_exp := d_exp["conname"][len(prefix) :]
                if d_exp["conname"].startswith(prefix)
                else d_exp["conname"]
            ) != d_act["conname"]:
                yield f"{tab_msg}, {conlabel(key)} name mismatch ({name_exp} <> {d_act['conname']})."
            elif d_exp["condeferrable"] != d_act["condeferrable"]:
                yield f"{tab_msg}, {conlabel(key)} {'should' if d_exp['condeferrable'] else 'should not'} be deferrable."
            elif d_exp["condeferred"] != d_act["condeferred"]:
                yield f"{tab_msg}, {conlabel(key)} {'should' if d_exp['condeferred'] else 'should not'} be deferred."

        for key in cdata_act.keys():
            yield f"{tab_msg}: extra constraint found ({conlabel(key)})."


def _colnames(toid, keys):
    return tuple(_colname(toid, k) for k in keys)


@cache
def _colname(toid: int, key: int):
    return DBSession.execute(
        sa.text("""
SELECT attname FROM pg_attribute
WHERE attrelid = :toid AND attnum = :attnum AND NOT attisdropped
"""),
        dict(toid=toid, attnum=key),
    ).scalar()


@cache
def _tname(oid: int):
    return DBSession.execute(sa.text("SELECT CAST(:oid AS regclass)"), dict(oid=oid)).scalar()


@cache
def _toid(name: str):
    return DBSession.execute(
        sa.text("SELECT CAST(:name AS regclass)::oid"), dict(name=name)
    ).scalar()


_conmap = dict(
    p=lambda r: _colnames(r.conrelid, r.conkey),
    u=lambda r: _colnames(r.conrelid, r.conkey),
    f=lambda r: (
        _colnames(r.conrelid, r.conkey),
        r.confrelid if r.confrelid != r.conrelid else None,  # check self-relation
        _colnames(r.confrelid, r.confkey),
    ),
    c=lambda r: r.expr,
)


def _group_constraints(qresult: sa.Result):
    data = dict()
    for row in qresult.mappings():
        cmpfun = _conmap.get(row.contype)
        if cmpfun is None:
            continue
        if row.contype not in data:
            data[row.contype] = dict()
        key = cmpfun(row)
        data[row.contype][key] = {
            k: row[k]
            for k in (
                "conname",
                "condeferrable",
                "condeferred",
            )
        }
    return data
