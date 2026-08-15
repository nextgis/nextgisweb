from datetime import datetime

import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
import sqlalchemy.orm as orm
from sqlalchemy.orm import Mapped, mapped_column

from nextgisweb.env import Base


class Session(Base):
    __tablename__ = "pyramid_session"

    id: Mapped[str] = mapped_column(sa.Unicode(32), primary_key=True)
    created: Mapped[datetime] = mapped_column(sa.DateTime)
    last_activity: Mapped[datetime] = mapped_column(sa.DateTime)

    store: Mapped[list["SessionStore"]] = orm.relationship(
        cascade="all,delete-orphan",
        back_populates="session",
    )


class SessionStore(Base):
    __tablename__ = "pyramid_session_store"

    session_id: Mapped[str] = mapped_column(
        sa.ForeignKey(Session.id, ondelete="cascade"),
        primary_key=True,
    )
    key: Mapped[str] = mapped_column(sa.Unicode, primary_key=True)
    value: Mapped[dict] = mapped_column(sa_pg.JSONB)

    session: Mapped[Session] = orm.relationship(
        foreign_keys=session_id,
        back_populates="store",
    )
