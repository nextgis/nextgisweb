import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
import sqlalchemy.orm as orm

from nextgisweb.env import Base

from nextgisweb.auth import User

from ..model import Resource


class ResourceFavoriteModel(Base):
    __tablename__ = "resource_favorite"

    id = sa.Column(sa.Integer, primary_key=True)
    resource_id = sa.Column(sa.ForeignKey(Resource.id, ondelete="CASCADE"), nullable=False)
    user_id = sa.Column(sa.ForeignKey(User.id, ondelete="CASCADE"), nullable=False)
    component = sa.Column(sa.Unicode, nullable=False)
    kind = sa.Column(sa.Unicode, nullable=False)
    created = sa.Column(sa.DateTime, nullable=False)
    label = sa.Column(sa.Unicode, nullable=True)
    data = sa.Column(sa_pg.JSONB, nullable=False)

    resource = orm.relationship(Resource)
    user = orm.relationship(User)

    @property
    def identity(self) -> str:
        return f"{self.component}.{self.kind}"
