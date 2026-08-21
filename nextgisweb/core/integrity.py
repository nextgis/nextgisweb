import re
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
    # "c" - check
    # "u" - unique
    # "f" - foreign
    # "p" - primary
    qconstraints = sa.text("""
WITH con_exp AS (
	SELECT pg_get_expr(conbin, conrelid) AS expr, conname
	FROM pg_constraint
	WHERE conrelid = CAST(:temp_name AS regclass) AND contype = 'c'
),
con_act AS (
	SELECT pg_get_expr(conbin, conrelid) AS expr, conname
	FROM pg_constraint
	WHERE conrelid = CAST(:name AS regclass) AND contype = 'c'
)
SELECT
	a.expr AS expr_exp,
	b.expr AS expr_act,
	a.conname AS name_exp,
	b.conname AS name_act
FROM con_exp a
FULL OUTER JOIN con_act b ON b.expr = a.expr
""")
    result = DBSession.execute(qconstraints, dict(temp_name=temp_tab.name, name=tab_name))
    for r in result.mappings():
        if r.expr_exp is None:
            yield f"{tab_msg}: extra constraint found: ({r.expr_exp})."
            continue
        con_msg = f"{tab_msg}, constraint ({r.expr_exp})"
        if r.expr_act is None:
            yield f"{con_msg}: not found."
        elif (
            name_exp := r.name_exp[len(prefix) :] if r.name_exp.startswith(prefix) else r.name_exp
        ) != r.name_act:
            yield f"{col_msg}: name mismatch ({name_exp} <> {r.name_act})."
