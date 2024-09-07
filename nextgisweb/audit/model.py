import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg

from nextgisweb.env import Base

tab_journal = sa.Table(
    "audit_journal",
    Base.metadata,
    sa.Column("tstamp", sa.DateTime, primary_key=True),
    sa.Column("ident", sa.SmallInteger, sa.Identity(cycle=True), primary_key=True),
    sa.Column("data", sa_pg.JSONB, nullable=False),
)
