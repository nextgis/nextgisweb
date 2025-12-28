from __future__ import annotations

from typing import Any

import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import Struct

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

    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)
    feature_id = sa.Column(sa.Integer, primary_key=True)
    value = sa.Column(sa.Unicode, nullable=False)

    fversioning_metadata_version = 1
    fversioning_extension = "description"
    fversioning_columns = ("value",)

    resource = orm.relationship(
        Resource,
        backref=orm.backref(
            "_backref_feature_description",
            cascade="all",
            cascade_backrefs=False,
        ),
    )

    @classmethod
    def fversioning_change_from_query(
        cls,
        act: ActColValue,
        fid: int,
        eid: None,
        vid: int,
        values: dict[str, Any],
    ) -> DescriptionPut:
        if act in ("C", "U"):
            return DescriptionPut(fid=fid, vid=vid, **values)
        elif act == "D":
            return DescriptionPut(fid=fid, vid=vid, value=None)
        else:
            raise NotImplementedError(f"{act=}")


@register_change
class DescriptionPut(Struct, kw_only=True, tag="description.put", tag_field="action"):
    fid: int
    vid: int
    value: str | None


DescriptionPut.__doc__ = (
    "The description has been modified between the initial and target "
    "versions. The NULL value means deletion of the description."
)
