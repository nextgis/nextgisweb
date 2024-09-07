import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
import sqlalchemy.orm as orm

from nextgisweb.env import Base


class Session(Base):
    __tablename__ = "pyramid_session"

    id = sa.Column(sa.Unicode(32), primary_key=True)
    created = sa.Column(sa.DateTime, nullable=False)
    last_activity = sa.Column(sa.DateTime, nullable=False)


class SessionStore(Base):
    __tablename__ = "pyramid_session_store"

    session_id = sa.Column(sa.ForeignKey(Session.id, ondelete="cascade"), primary_key=True)
    key = sa.Column(sa.Unicode, primary_key=True)
    value = sa.Column(sa_pg.JSONB, nullable=False)

    session = orm.relationship(
        Session,
        foreign_keys=session_id,
        backref=orm.backref("store", cascade="all,delete-orphan"),
    )
