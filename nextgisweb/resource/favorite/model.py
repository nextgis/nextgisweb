from datetime import datetime

import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
import sqlalchemy.orm as orm
from sqlalchemy.orm import Mapped, mapped_column

from nextgisweb.env import Base

from nextgisweb.auth import User

from ..model import Resource


class ResourceFavoriteModel(Base):
    __tablename__ = "resource_favorite"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    resource_id: Mapped[int] = mapped_column(sa.ForeignKey(Resource.id, ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(sa.ForeignKey(User.id, ondelete="CASCADE"))
    component: Mapped[str] = mapped_column(sa.Unicode)
    kind: Mapped[str] = mapped_column(sa.Unicode)
    created: Mapped[datetime] = mapped_column(sa.DateTime)
    label: Mapped[str | None] = mapped_column(sa.Unicode)
    data: Mapped[dict] = mapped_column(sa_pg.JSONB)

    resource: Mapped[Resource] = orm.relationship()

    user: Mapped[User] = orm.relationship()

    @property
    def identity(self) -> str:
        return f"{self.component}.{self.kind}"
