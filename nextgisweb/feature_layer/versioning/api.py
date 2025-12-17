from base64 import urlsafe_b64decode, urlsafe_b64encode
from datetime import datetime, timedelta
from itertools import islice
from typing import TYPE_CHECKING, Annotated, Generator, List, Literal, Union

import sqlalchemy as sa
from msgspec import Meta, Struct
from msgspec.msgpack import decode as msgspec_decode
from msgspec.msgpack import encode as msgspec_encode
from pyramid.response import Response

from nextgisweb.env import DBSession
from nextgisweb.lib.apitype import AnyOf, AsJSON, StatusCode

from nextgisweb.auth.api import UserReadBrief, UserRef, serialize_principal
from nextgisweb.resource import DataScope, resource_factory

from ..interface import (
    FeatureLayerFieldDatatype,
    FeaureLayerGeometryType,
    IVersionableFeatureLayer,
)
from ..versioning import FVersioningExtensionMixin
from .exception import (
    FVersioningEpochMismatch,
    FVersioningEpochRequired,
    FVersioningInvalidRange,
    FVersioningNotEnabled,
    FVersioningOutOfRange,
)
from .model import (
    FeatureCreate,
    FeatureDelete,
    FeatureUpdate,
    FVersioningFeatureSummary,
    FVersioningObj,
    registry,
)

Epoch = Annotated[int, Meta(gt=0, description="Versioning epoch")]
VersionID = Annotated[int, Meta(ge=0, description="Version ID")]
VersionTstamp = Annotated[datetime, Meta(tz=False, description="Version timestamp")]

# TODO: Switch to datetime type when it will be supported for query parameters
TIMESTAMP_PATTERN = r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?$"
TimestampParam = Annotated[str, Meta(pattern=TIMESTAMP_PATTERN)]


class FieldSummary(Struct, kw_only=True):
    id: int
    keyname: str
    datatype: FeatureLayerFieldDatatype


class SRSReference(Struct, kw_only=True):
    id: int


class ChangesCheckResponse(Struct, kw_only=True):
    epoch: Epoch
    initial: VersionID
    target: VersionID
    tstamp: datetime
    geometry_type: FeaureLayerGeometryType
    srs: SRSReference
    fields: List[FieldSummary]
    fetch: Annotated[str, Meta(description="URL to start fetching changes")]


class ChangesCursor(Struct, kw_only=True, array_like=True):
    fields: List[int]
    extensions: List[str]
    fid_last: Union[int, None] = None

    def encode(self):
        mp = msgspec_encode(self)
        b64 = urlsafe_b64encode(mp)
        return b64.rstrip(b"=").decode()

    @classmethod
    def decode(cls, value) -> "ChangesCursor":
        if pad := (4 - (len(value) % 4)):
            value += "=" * pad
        mp = urlsafe_b64decode(value)
        return msgspec_decode(mp, type=ChangesCursor)


Extension = str
if not TYPE_CHECKING:
    ext_classes = list(FVersioningExtensionMixin.fversioning_registry.values())
    Extension = Literal[tuple(ext.fversioning_extension for ext in ext_classes)]


def change_check(
    resource,
    request,
    *,
    initial: VersionID = 0,
    target: VersionID | None = None,
    epoch: Epoch | None = None,
    extensions: List[Extension] = [],
) -> AnyOf[
    ChangesCheckResponse,
    Annotated[None, StatusCode(204)],
]:
    """Check for changes between versions

    :param initial: Initial already fetched version, 0 if not set
    :param target: Target version to obtain, latest if not set
    :param epoch: Versioning epoch, required if initial > 0
    :param extensions: Include feature extensions"""

    request.resource_permission(DataScope.read)
    FVersioningNotEnabled.disprove(resource)

    initial = 0 if not initial else int(initial)

    if epoch is not None:
        FVersioningEpochMismatch.disprove(resource, epoch)
        FVersioningOutOfRange.disprove(resource, initial, allow_zero=True)
    elif initial == 0:
        epoch = resource.fversioning.epoch
    else:
        raise FVersioningEpochRequired()
    assert epoch is not None

    if target:
        FVersioningOutOfRange.disprove(resource, target)
    else:
        target = resource.fversioning.latest

    if initial == target:
        return Response(status=204)

    FVersioningInvalidRange.disprove(initial, target)
    tstamp = FVersioningObj.filter_by(resource_id=resource.id, version_id=target).one().tstamp

    fields = [
        FieldSummary(
            id=field.id,
            keyname=field.keyname,
            datatype=field.datatype,
        )
        for field in resource.fields
    ]

    cursor = ChangesCursor(fields=[df.id for df in fields], extensions=extensions)

    fetch = request.route_url(
        "feature_layer.changes_fetch",
        id=resource.id,
        _query=dict(
            epoch=epoch,
            initial=initial,
            target=target,
            cursor=cursor.encode(),
        ),
    )

    return ChangesCheckResponse(
        epoch=epoch,
        initial=initial,
        target=target,
        tstamp=tstamp,
        geometry_type=resource.geometry_type,
        srs=SRSReference(id=resource.srs.id),
        fields=fields,
        fetch=fetch,
    )


class ChangesContinue(Struct, tag="continue", tag_field="action"):
    url: str


ChangesContinue.__doc__ = (
    "The continuation marker, if present, an URL from this marker should be "
    "fetched. Repeat until receive a response without a marker."
)

ChangeTypes = Union[FeatureCreate, FeatureUpdate, FeatureDelete]
if not TYPE_CHECKING:
    ChangeTypes = Union[tuple(registry)]


def change_fetch(
    resource,
    request,
    *,
    epoch: Epoch,
    initial: VersionID,
    target: VersionID,
    cursor: str,
) -> AsJSON[List[Union[ChangesContinue, ChangeTypes]]]:
    """Fetch changes incrementally

    :param initial: Initial version
    :param target: Target version
    :param epoch: Versioning epoch
    :param cursor: Opaque pagination cursor"""

    request.resource_permission(DataScope.read)

    FVersioningEpochMismatch.disprove(resource, epoch)
    FVersioningOutOfRange.disprove(resource, initial, allow_zero=True)
    FVersioningOutOfRange.disprove(resource, target, allow_zero=False)
    FVersioningInvalidRange.disprove(initial, target)

    cursor_obj = ChangesCursor.decode(cursor)
    fid_limit = 100

    fid_queries = [*resource.fversioning_changed_fids()]
    for ext_cls in FVersioningExtensionMixin.fversioning_registry.values():
        fid_queries.extend(ext_cls.fversioning_changed_fids())

    lit_fid = sa.literal_column("fid")
    qfid = sa.union_all(*fid_queries).subquery()
    qfid = (
        sa.select(qfid.c.fid)
        .group_by(lit_fid)
        .order_by(lit_fid)
        .limit(sa.bindparam("p_fid_limit"))
    ).subquery()
    qfid = sa.select(sa.literal_column("MIN(fid), MAX(fid)")).select_from(qfid)
    fid_min, fid_max = DBSession.execute(
        qfid,
        dict(
            p_rid=resource.id,
            p_initial=initial,
            p_target=target,
            p_fid_last=cursor_obj.fid_last,
            p_fid_limit=fid_limit,
        ),
    ).first()

    final = fid_max is None
    operations = list()

    if not final:
        opi = resource.fversioning_changes(
            initial=initial,
            target=target,
            fid_min=fid_min,
            fid_max=fid_max,
        )
        for op in opi:
            operations.append(op)

        ext_registry = FVersioningExtensionMixin.fversioning_registry
        for ext_identity in cursor_obj.extensions:
            ext_cls = ext_registry[ext_identity]
            for op in ext_cls.fversioning_changes(
                resource,
                initial=initial,
                target=target,
                fid_min=fid_min,
                fid_max=fid_max,
            ):
                operations.append(op)

        cursor_obj.fid_last = fid_max
        operations.append(
            ChangesContinue(
                request.route_url(
                    "feature_layer.changes_fetch",
                    id=resource.id,
                    _query=dict(
                        epoch=epoch,
                        initial=initial,
                        target=target,
                        cursor=cursor_obj.encode(),
                    ),
                )
            )
        )

    return operations


VersionCGetOrder = Annotated[
    Literal["asc", "desc"],
    Meta(
        description="Order of versions: `asc` for ascending (oldest to newest), "
        "`desc` for descending (newest to oldest)",
    ),
]

VersionCGetCursor = Annotated[
    str,
    Meta(min_length=1),
    Meta(description="Opaque pagination cursor"),
]


class VersionCGetVersion(Struct, kw_only=True, tag="version"):
    id: VersionID
    tstamp: VersionTstamp
    user: UserRef | None
    feature: FVersioningFeatureSummary

    def cursor(self, *, order: VersionCGetOrder) -> str:
        return str(self.id)


class VersionCGetGroup(Struct, kw_only=True, tag="group"):
    id: tuple[VersionID, VersionID]
    tstamp: tuple[VersionTstamp, VersionTstamp]
    user: UserRef | None
    feature: FVersioningFeatureSummary

    def cursor(self, *, order: VersionCGetOrder) -> str:
        return str(self.id[1] if order == "asc" else self.id[0])


VersionCGetItem = VersionCGetVersion | VersionCGetGroup


class VersionCGetResponse(Struct, kw_only=True):
    cursor: VersionCGetCursor | None
    items: List[VersionCGetItem]

    @classmethod
    def from_generator(
        cls,
        gen: Generator[VersionCGetItem, None, None],
        *,
        order: VersionCGetOrder,
        limit: int,
    ):
        items = list(islice(gen, limit))
        cursor = items[-1].cursor(order=order) if len(items) == limit else None
        return cls(cursor=cursor, items=items)


def version_cget(
    resource,
    request,
    *,
    epoch: Epoch,
    order: VersionCGetOrder,
    group: Annotated[
        bool,
        Meta(description="Group consecutive versions by the same user"),
    ] = False,
    tstamp_ge: Annotated[
        TimestampParam | None,
        Meta(description="Minimum timestamp (inclusive)"),
    ] = None,
    tstamp_lt: Annotated[
        TimestampParam | None,
        Meta(description="Maximum timestamp (exclusive)"),
    ] = None,
    limit: Annotated[
        int,
        Meta(ge=1, le=500),
        Meta(description="Limit the number of items returned"),
    ] = 50,
    cursor: VersionCGetCursor | None = None,
) -> VersionCGetResponse:
    """Read versions metadata"""

    request.resource_permission(DataScope.read)

    FVersioningEpochMismatch.disprove(resource, epoch)

    def _reader(page_size=50):
        vid_col = FVersioningObj.version_id
        cnt = vid_col.op(">") if order == "asc" else vid_col.op("<")
        ord = vid_col.asc() if order == "asc" else vid_col.desc()

        query = FVersioningObj.filter_by(resource_id=resource.id).order_by(ord)
        if tstamp_ge is not None:
            query = query.filter(FVersioningObj.tstamp >= datetime.fromisoformat(tstamp_ge))
        if tstamp_lt is not None:
            query = query.filter(FVersioningObj.tstamp < datetime.fromisoformat(tstamp_lt))

        last_id = int(cursor) if cursor else None

        while True:
            fquery = query.filter(cnt(last_id)) if last_id else query
            num = 0
            for obj in fquery.limit(page_size):
                last_id = obj.version_id
                yield obj
                num += 1
            if num != page_size:
                break

    def _summary(vid_min: int, vid_max: int) -> FVersioningFeatureSummary:
        initial, target = vid_min - 1, vid_max
        fid_queries = [*resource.fversioning_changed_fids()]

        # TODO: Consider extensions summary too

        lit_fid = sa.literal_column("fid")
        qfid = sa.union_all(*fid_queries).subquery()
        qfid = (sa.select(qfid.c.fid).group_by(lit_fid).order_by(lit_fid)).subquery()
        qfid = sa.select(sa.literal_column("MIN(fid), MAX(fid)")).select_from(qfid)
        fid_min, fid_max = DBSession.execute(
            qfid,
            dict(
                p_rid=resource.id,
                p_initial=initial,
                p_target=target,
                p_fid_last=None,
                p_fid_limit=(1 << 32) - 1,
            ),
        ).first()
        return resource.fversioning_summary(
            initial=initial,
            target=target,
            fid_min=fid_min,
            fid_max=fid_max,
        )

    def _group(tstamp_max_gap=timedelta(seconds=120).total_seconds()):
        head = tail = None
        swap = (lambda a, b: (a, b)) if order == "asc" else (lambda a, b: (b, a))
        for row in _reader():
            if head is None:
                head = tail = row
            elif (
                row.user_id == tail.user_id
                and abs((tail.tstamp - row.tstamp).total_seconds()) <= tstamp_max_gap
            ):
                tail = row
            else:
                assert head and tail
                yield swap(head, tail)
                head = tail = row
        if head and tail:
            yield swap(head, tail)

    pairs = ((vobj, vobj) for vobj in _reader()) if not group else _group()

    generator = (
        (
            VersionCGetVersion(
                id=vmin.version_id,
                tstamp=vmin.tstamp,
                user=UserRef(id=vmin.user_id) if vmin.user_id else None,
                feature=_summary(vmin.version_id, vmin.version_id),
            )
            if (vmin == vmax)
            else (
                VersionCGetGroup(
                    id=(vmin.version_id, vmax.version_id),
                    tstamp=(vmin.tstamp, vmax.tstamp),
                    user=UserRef(id=vmin.user_id) if vmin.user_id else None,
                    feature=_summary(vmin.version_id, vmax.version_id),
                )
            )
        )
        for (vmin, vmax) in pairs
    )

    return VersionCGetResponse.from_generator(
        generator,
        order=order,
        limit=limit,
    )


class VersionRead(Struct, kw_only=True):
    id: VersionID
    tstamp: VersionTstamp
    user: Union[UserReadBrief, None]


def version_iget(resource, request, vid: VersionID) -> VersionRead:
    """Read version metadata"""

    request.resource_permission(DataScope.read)

    FVersioningOutOfRange.disprove(resource, vid, allow_zero=False)

    obj = FVersioningObj.filter_by(resource_id=resource.id, version_id=vid).one()

    return VersionRead(
        id=obj.version_id,
        tstamp=obj.tstamp,
        user=(
            serialize_principal(obj_user, UserReadBrief, tr=request.translate)
            if (obj_user := obj.user)
            else None
        ),
    )


def setup_pyramid(comp, config):
    config.add_route(
        "feature_layer.changes_check",
        "/api/resource/{id:uint}/feature/changes/check",
        factory=resource_factory,
    ).get(change_check, context=IVersionableFeatureLayer)

    config.add_route(
        "feature_layer.changes_fetch",
        "/api/resource/{id:uint}/feature/changes/fetch",
        factory=resource_factory,
    ).get(change_fetch, context=IVersionableFeatureLayer)

    config.add_route(
        "feature_layer.version.collection",
        "/api/resource/{id:uint}/feature/version/",
        factory=resource_factory,
    ).get(version_cget, context=IVersionableFeatureLayer)

    config.add_route(
        "feature_layer.version.item",
        "/api/resource/{id}/feature/version/{vid}",
        types=dict(vid=int),
        factory=resource_factory,
    ).get(version_iget, context=IVersionableFeatureLayer)
