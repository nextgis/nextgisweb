from __future__ import annotations

from typing import Any

import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import Struct
from sqlalchemy.orm import Mapped, mapped_column

from nextgisweb.env import Base

from nextgisweb.feature_layer.versioning import (
    ActColValue,
    FVersioningExtensionMixin,
    register_change,
)
from nextgisweb.resource import Resource

Base.depends_on("resource", "feature_layer")


class FeatureDescription(Base, FVersioningExtensionMixin):
    __tablename__ = "feature_description"

    resource_id: Mapped[int] = mapped_column(sa.ForeignKey(Resource.id), primary_key=True)
    feature_id: Mapped[int] = mapped_column(sa.Integer, primary_key=True)
    value: Mapped[str] = mapped_column(sa.Unicode)

    fversioning_metadata_version = 1
    fversioning_extension = "description"
    fversioning_columns = ("value",)

    resource: Mapped[Resource] = orm.relationship(
        backref=orm.backref(
            "_backref_feature_description",
            cascade="all",
        ),
    )

    @classmethod
    def fversioning_change_from_query(
        cls,
        action: ActColValue,
        fid: int,
        eid: int | None,
        vid: int,
        values: dict[str, Any],
    ) -> DescriptionPut:
        assert eid is None
        if action in ("C", "U"):
            return DescriptionPut(fid=fid, vid=vid, **values)
        elif action == "D":
            return DescriptionPut(fid=fid, vid=vid, value=None)
        else:
            raise NotImplementedError(f"{action=}")


@register_change
class DescriptionPut(Struct, kw_only=True, tag="description.put", tag_field="action"):
    fid: int
    vid: int
    value: str | None


DescriptionPut.__doc__ = (
    "The description has been modified between the initial and target "
    "versions. The NULL value means deletion of the description."
)
