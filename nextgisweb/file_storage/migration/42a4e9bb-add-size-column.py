""" {
    "revision": "42a4e9bb", "parents": ["2978ca7f"],
    "date": "2024-02-11T01:03:48",
    "message": "Add size column"
} """

from itertools import islice
from pathlib import Path

import sqlalchemy as sa

from nextgisweb.env import DBSession


def forward(ctx):
    con = DBSession.connection()
    con.execute(sa.text("ALTER TABLE fileobj ADD COLUMN size bigint"))

    tab = sa.table("fileobj", *[sa.Column(c) for c in ("id", "component", "uuid", "size")])
    qsel = sa.select(tab.c.id, tab.c.component, tab.c.uuid).filter_by(size=None)
    qupd = sa.update(tab).values(size=sa.bindparam("v")).filter_by(id=sa.bindparam("k"))

    def _iter_sizes():
        filename = lambda ref: Path(ctx.env.file_storage.filename(ref))
        for id, component, uuid in con.execute(qsel):
            ref = (component, uuid)
            yield (id, filename(ref).stat().st_size)

    sizes = iter(_iter_sizes())
    while chunk := [dict(k=id, v=size) for id, size in islice(sizes, 100)]:
        con.execute(qupd, chunk)

    con.execute(sa.text("ALTER TABLE fileobj ALTER COLUMN size SET NOT NULL"))


def rewind(ctx):
    con = DBSession.connection()
    con.execute(sa.text("ALTER TABLE fileobj DROP COLUMN size"))
