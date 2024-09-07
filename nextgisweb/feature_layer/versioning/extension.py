from __future__ import annotations

from functools import cached_property, partial
from typing import Any, ClassVar, Dict, Literal, NamedTuple, Optional, Sequence, Tuple, Type, Union

import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
from msgspec import Struct
from sqlalchemy import event, inspect
from sqlalchemy.sql import and_ as sql_and
from sqlalchemy.sql import or_ as sql_or

from nextgisweb.env import DBSession

from ..interface import IVersionableFeatureLayer
from .exception import VersioningContextRequired
from .model import ActColValue, FVersioningMeta, FVersioningObj


class VersioningTables(NamedTuple):
    ct: sa.Table
    et: sa.Table
    ht: sa.Table


class ExtensionQueries:
    def __init__(self, tables: VersioningTables, *, has_id: bool, cols: Tuple[str]):
        self.tables = tables
        self.has_id = has_id
        self.cols = cols

    @cached_property
    def after_insert(self):
        values = dict()
        if self.has_id:
            values["extension_id"] = sa.bindparam("p_eid")
        values["resource_id"] = sa.bindparam("p_rid")
        values["feature_id"] = sa.bindparam("p_fid")
        values["version_id"] = sa.bindparam("p_vid")
        values["version_op"] = sa.bindparam("p_vop", "C")
        return self.tables.et.insert().values(values)

    @cached_property
    def before_update(self):
        return self.__update_delete_query("U")

    @cached_property
    def before_delete(self):
        return self.__update_delete_query("D")

    @cached_property
    def delete_ctab(self):
        return self.__update_delete_query("O")

    @cached_property
    def initfill(self):
        ct, et, _ = self.tables
        cs = sa.select().where(ct.c.resource_id == sa.bindparam("p_rid"))
        cols = ["resource_id", "feature_id", "version_id", "version_op"]
        if self.has_id:
            cs = cs.add_columns(ct.c.id)
            cols.insert(0, "extension_id")
        cs = cs.add_columns(ct.c.resource_id, ct.c.feature_id)
        cs = cs.add_columns(sa.bindparam("p_vid"), sa.bindparam("p_vop", "E"))
        return sa.insert(et).from_select(cols, cs)

    @cached_property
    def feature_pit(self):
        ct, et, ht = self._aliased_tables
        p_vid = sa.bindparam("p_vid")
        p_fid = sa.bindparam("p_fid")
        p_rid = sa.bindparam("p_rid")
        qh = sa.select(
            *((ht.c.extension_id,) if self.has_id else ()),
            ht.c.version_id,
            *(getattr(ht.c, c) for c in self.cols),
        )

        rng_resource_id = sa.literal_column("int4range(resource_id, resource_id, '[]')")
        qh = qh.where(rng_resource_id.op("@>", precedence=4)(p_rid))
        rng_version_id = sa.literal_column("int4range(version_id, version_nid)")
        qh = qh.where(rng_version_id.op("@>", precedence=4)(p_vid))
        rng_feature_id = sa.literal_column("int4range(feature_id, feature_id, '[]')")
        qh = qh.where(rng_feature_id.op("@>", precedence=4)(p_fid))

        qe = sa.select(
            *((et.c.extension_id,) if self.has_id else ()),
            et.c.version_id,
            *(getattr(ct.c, c) for c in self.cols),
        )
        qe = qe.where(et.c.feature_id == p_fid, et.c.resource_id == p_rid)
        qe = qe.where(et.c.version_id <= p_vid)
        qe = qe.join(
            ct,
            sa.and_(
                ct.c.resource_id == et.c.resource_id,
                ct.c.feature_id == et.c.feature_id,
                (ct.c.id == et.c.extension_id)
                if self.has_id
                else (ct.c.resource_id == et.c.resource_id),
            ),
        )
        query = sa.union_all(qh, qe)
        return query

    @cached_property
    def changed_fids(self):
        p_rid = sa.bindparam("p_rid")
        p_initial, p_target = sa.bindparam("p_initial"), sa.bindparam("p_target")
        p_fid_limit, p_fid_last = sa.bindparam("p_fid_limit"), sa.bindparam("p_fid_last")

        result = []
        for t in self._aliased_tables[1:]:
            query = (
                sa.select(t.c.feature_id.distinct().label("fid"))
                .where(
                    t.c.resource_id == p_rid,
                    t.c.version_id > p_initial,
                    t.c.version_id <= p_target,
                    sql_or(p_fid_last.is_(None), t.c.feature_id > p_fid_last),
                )
                .order_by(t.c.feature_id)
                .limit(p_fid_limit)
            )
            result.append(query)
        return tuple(result)

    @cached_property
    def changes(self):
        ct, et, ht = self._aliased_tables
        lc = sa.literal_column
        p_rid = sa.bindparam("p_rid")
        p_initial, p_target = sa.bindparam("p_initial"), sa.bindparam("p_target")
        p_fid_min, p_fid_max = sa.bindparam("p_fid_min"), sa.bindparam("p_fid_max")

        lc_resource_range = lambda s: sa.func.int4range(
            s.c.resource_id,
            s.c.resource_id,
            sa.text("'[]'"),
        )

        hcolumns = (
            lambda s: (s.c.feature_id.label("fid"),)
            + ((s.c.extension_id.label("eid"),) if self.has_id else ())
            + (s.c.version_id.label("vid"),)
        )

        where_resource = lambda s: lc_resource_range(s).op("@>", precedence=4)(p_rid)
        where_range = lc("int4range(version_id, version_nid)").op("@>", precedence=4)
        where_fid = lambda s: (s.c.feature_id >= p_fid_min, s.c.feature_id <= p_fid_max)

        # Initial version (without etab)
        qi = (
            sa.select(
                *hcolumns(ht),
                ht.c.version_op.op("=")(sa.text("'D'")).label("deleted"),
                *(getattr(ht.c, c) for c in self.cols),
            )
            .where(where_resource(ht), where_range(p_initial), *where_fid(ht))
            .subquery("qi")
        )

        # Target version
        qt = sa.union_all(
            sa.select(
                *hcolumns(et),
                ct.c.feature_id.is_(None).label("deleted"),
                *(getattr(ct.c, c) for c in self.cols),
            )
            .join(
                ct,
                sa.and_(
                    ct.c.resource_id == p_rid,
                    ct.c.feature_id == et.c.feature_id,
                    *([ct.c.id == et.c.extension_id] if self.has_id else ()),
                ),
                isouter=True,
            )
            .where(
                et.c.resource_id == p_rid,
                et.c.version_id > p_initial,
                et.c.version_id <= p_target,
                *where_fid(et),
            ),
            sa.select(
                *hcolumns(ht),
                ht.c.version_op.op("=")(sa.text("'D'")).label("deleted"),
                *(getattr(ht.c, c) for c in self.cols),
            ).where(where_resource(ht), where_range(p_target), *where_fid(ht)),
        ).subquery("qt")

        lat_pr = sa.select(
            lc("qi.fid IS NOT NULL AND NOT qi.deleted").label("pi"),
            lc("qi.fid IS NOT NULL AND qi.deleted").label("di"),
            lc("qt.fid IS NOT NULL AND NOT qt.deleted").label("pt"),
        ).lateral("lat_pr")

        tpl_sc = "pt AND (NOT pi OR qt.{0} IS DISTINCT FROM qi.{0})"
        lat_sc = sa.select(*(lc(tpl_sc.format(c)).label(f"sc_{c}") for c in self.cols))
        lat_sc = lat_sc.lateral("lat_sc")

        lat_up = sa.select(lc(" OR ".join(f"sc_{c}" for c in self.cols)).label("up"))
        lat_up = lat_up.lateral("lat_up")

        tpl_sg = "CASE WHEN sc_{0} THEN qt.{0} END"
        tpl_sc = "CASE WHEN sc_{0} THEN '1' ELSE '0' END"
        q = sa.select(
            lc(
                "CASE "
                "WHEN NOT pi AND pt AND NOT di THEN 'C' "
                "WHEN pi AND pt AND up THEN 'U' "
                "WHEN pi AND NOT pt THEN 'D' "
                "WHEN NOT pi AND pt AND di THEN 'R' "
                "END"
            ).label("action"),
            lc("COALESCE(qi.fid, qt.fid)").label("fid"),
            (lc("COALESCE(qi.eid, qt.eid)") if self.has_id else sa.null()).label("eid"),
            lc("qt.vid").label("vid"),
            lc(f"CONCAT({', '.join(tpl_sc.format(c) for c in self.cols)})").label("sc"),
            *(lc(tpl_sg.format(c)).label(c) for c in self.cols),
        ).where(sa.text("pi != pt OR up"))

        it_join = [qi.c.fid == qt.c.fid] + ([qi.c.eid == qt.c.eid] if self.has_id else [])
        q = q.select_from(
            qi.join(qt, sql_and(*it_join), full=True)
            .join(lat_pr, sa.text("TRUE"))
            .join(lat_sc, sa.text("TRUE"))
            .join(lat_up, sa.text("TRUE"))
        )

        for sc_idx, c in enumerate(q.selected_columns):
            if c.name == "sc":
                break
        else:
            raise ValueError

        q.row_sig_values = lambda row: {
            self.cols[bidx]: row[sc_idx + bidx + 1]
            for bidx, bit in enumerate(row[sc_idx])
            if bit == "1"
        }

        return q

    @cached_property
    def _aliased_tables(self):
        ct, et, ht = self.tables
        return (ct.alias("ct"), et.alias("et"), ht.alias("ht"))

    def __update_delete_query(self, vop: Union[Literal["U"], Literal["D"], Literal["O"]]):
        ct, et, ht = self.tables
        trailer = sa.literal_column(", ".join(self.cols))

        p_rid = sa.bindparam("p_rid")
        p_fid = sa.bindparam("p_fid")
        p_vid = sa.bindparam("p_vid")
        default_vop = "U" if vop == "U" else "D"
        p_vop = sa.bindparam("p_vop", default_vop)

        returning = lambda s: (s.c.resource_id, s.c.feature_id)
        join_on = lambda f, t: (
            t.c.resource_id == f.c.resource_id,
            t.c.feature_id == f.c.feature_id,
        )

        if self.has_id:
            returning = lambda s, ref=returning: ref(s) + (
                s.c.id if s == ct else s.c.extension_id,
            )
            join_on = lambda f, t, ref=join_on: ref(f, t) + (
                (t.c.id if t == ct else t.c.extension_id)
                == (f.c.id if f == ct else f.c.extension_id),
            )

        cs = sa.select()
        if self.has_id:
            cs = cs.add_columns(et.c.extension_id)
            cs = cs.where(ct.c.id == et.c.extension_id)
            if vop != "O":
                p_eid = sa.bindparam("p_eid")
                cs = cs.where(et.c.extension_id == p_eid)
        cs = cs.add_columns(et.c.resource_id, et.c.feature_id, et.c.version_id, et.c.version_op)
        cs = cs.add_columns(p_vid.label("version_nid"), p_vop.label("version_nop"), trailer)

        cs = cs.where(
            et.c.resource_id == p_rid,
            et.c.feature_id == p_fid,
            ct.c.resource_id == et.c.resource_id,
            ct.c.feature_id == et.c.feature_id,
        ).cte("cs")

        hi = sa.insert(ht).from_select(
            [
                *(["extension_id"] if self.has_id else []),
                "resource_id",
                "feature_id",
                "version_id",
                "version_op",
                "version_nid",
                "version_nop",
                *self.cols,
            ],
            cs,
        )

        eq = sa.update(et).values(version_id=p_vid, version_op=p_vop)

        hi = hi.returning(*returning(ht)).cte("hi")
        eq = eq.where(*join_on(hi, et)).returning(*returning(et))

        if vop != "O":
            return eq

        eq = eq.cte("eq")
        dc = sa.delete(ct).where(*join_on(ct, eq))
        dc = dc.returning(*returning(ct))
        return dc


class FVersioningExtensionMixin:
    fversioning_registry: ClassVar[Dict[str, Type[FVersioningExtensionMixin]]] = dict()

    # Class attributes, descendants must define them
    fversioning_metadata_version: ClassVar[int]
    fversioning_extension: ClassVar[str]
    fversioning_columns: ClassVar[Sequence[str]]
    fversioning_htab_args: ClassVar[Sequence[Any]] = tuple()

    # Instance attributes, used internaly
    fversioning_vobj: Optional[FVersioningObj] = None
    fversioning_initializing: bool

    def __init_subclass__(cls) -> None:
        cls.fversioning_registry[cls.fversioning_extension] = cls

        event.listen(cls, "mapper_configured", cls.__mapper_configured)
        event.listen(cls, "init", cls.__instance_init)
        event.listen(cls, "load", cls.__instance_load)
        event.listen(cls, "after_insert", partial(cls.__mapper_hook, hook="after_insert"))
        event.listen(cls, "before_update", partial(cls.__mapper_hook, hook="before_update"))
        event.listen(cls, "before_delete", partial(cls.__mapper_hook, hook="before_delete"))

    def __new__(cls, *args, **kwargs):
        instance = super().__new__(cls)
        instance.fversioning_initializing = True
        return instance

    def delete(self):
        session = sa.inspect(self).session
        if not session:
            raise VersioningContextRequired

        session.delete(self)
        resource = self.resource
        if not IVersionableFeatureLayer.providedBy(resource) or not resource.fversioning:
            return

        self.fversioning_track(resource)

    def fversioning_track(self, resource):
        if (vobj := resource.fversioning_vobj) is None:
            raise VersioningContextRequired

        self.fversioning_vobj = vobj
        vobj.mark_changed()

    @classmethod
    def fversioning_changed_fids(cls):
        return cls.fversioning_queries.changed_fids

    @classmethod
    def fversioning_changes(cls, resource, *, initial, target, fid_min, fid_max):
        initial = initial or 0

        query = cls.fversioning_queries.changes
        row_sig_values = query.row_sig_values

        qresult = DBSession.execute(
            query,
            dict(
                p_rid=resource.id,
                p_initial=initial,
                p_target=target,
                p_fid_min=fid_min,
                p_fid_max=fid_max,
            ),
        )

        for row in qresult:
            yield cls.fversioning_change_from_query(*row[:4], row_sig_values(row))

    @classmethod
    def fversioning_change_from_query(
        cls,
        action: ActColValue,
        fid: int,
        eid: None,
        vid: int,
        values: Dict[str, Any],
    ) -> Type[Struct]:
        raise NotImplementedError

    @classmethod
    def __setup_metadata(cls):
        assert cls.fversioning_metadata_version == 1

        prefix = cls.__tablename__
        metadata = cls.metadata
        cls.fversioning_has_id = hasattr(cls, "id")

        cls.fversioning_etab = sa.Table(
            *(f"{prefix}_et", metadata),
            cls.__resource_id_column(),
            cls.__feature_id_column(),
            *cls.__extension_id_column_as_list(),
            cls.__version_id_column(next=False),
            cls.__version_op_column(next=False),
            cls.__version_fkey(prefix, "et", next=False),
            sa.Index(
                f"{prefix}_et_resource_id_version_id_feature_id_idx",
                "resource_id",
                "version_id",
                "feature_id",
            ),
        )

        data_columns = [
            sa.Column(c.name, c.type, key=c.key, nullable=True)
            for c in cls.__table__.columns
            if c.key in cls.fversioning_columns
        ]

        cls.fversioning_cols = tuple(c.name for c in data_columns)

        cls.fversioning_htab = sa.Table(
            *(f"{prefix}_ht", metadata),
            cls.__resource_id_column(),
            cls.__version_id_column(next=False, primary_key=True),
            cls.__feature_id_column(),
            *cls.__extension_id_column_as_list(),
            cls.__version_id_column(next=True),
            cls.__version_op_column(next=False),
            cls.__version_op_column(next=True),
            *data_columns,
            cls.__version_fkey(prefix, "ht", next=True),
            *cls.fversioning_htab_args,
            sa_pg.ExcludeConstraint(
                (sa.literal_column("int4range(resource_id, resource_id, '[]')"), "&&"),
                (sa.literal_column("int4range(version_id, version_nid)"), "&&"),
                (sa.literal_column("int4range(feature_id, feature_id, '[]')"), "&&"),
                *(
                    ((sa.literal_column("int4range(extension_id, extension_id, '[]')"), "&&"),)
                    if cls.fversioning_has_id
                    else ()
                ),
                name=f"{prefix}_ht_range_idx",
            ),
        )

    @classmethod
    def __extension_id_column_as_list(cls):
        if not cls.fversioning_has_id:
            return []
        return [sa.Column("extension_id", sa.Integer, primary_key=True)]

    @classmethod
    def __resource_id_column(cls, **kwargs):
        return sa.Column(
            "resource_id",
            sa.ForeignKey(
                FVersioningMeta.resource_id,
                ondelete="CASCADE",
                deferrable=True,
                initially="DEFERRED",
            ),
            primary_key=True,
            **kwargs,
        )

    @classmethod
    def __feature_id_column(cls, **kwargs):
        return sa.Column("feature_id", sa.Integer, primary_key=True, **kwargs)

    @classmethod
    def __version_id_column(cls, next=False, **kwargs):
        s = "n" if next else ""
        return sa.Column(f"version_{s}id", sa.Integer, nullable=False, **kwargs)

    @classmethod
    def __version_op_column(cls, next=False, **kwargs):
        s = "n" if next else ""
        return sa.Column(f"version_{s}op", sa.CHAR(1), nullable=False, **kwargs)

    @classmethod
    def __version_fkey(cls, prefix, tsuf, next=False):
        s = "n" if next else ""
        return sa.ForeignKeyConstraint(
            ["resource_id", f"version_{s}id"],
            [FVersioningObj.resource_id, FVersioningObj.version_id],
            deferrable=True,
            initially="DEFERRED",
            name=f"{prefix}_{tsuf}_resource_id_version_{s}id_fkey",
        )

    # Events

    @classmethod
    def __instance_init(cls, target, args, kwargs):
        assert target.fversioning_initializing
        resource = kwargs["resource"]
        if not IVersionableFeatureLayer.providedBy(resource) or not resource.fversioning:
            return

        session = sa.inspect(resource).session
        if not session or (vobj := resource.fversioning_vobj) is None:
            raise VersioningContextRequired

        session.add(target)
        target.fversioning_vobj = vobj
        vobj.mark_changed()
        target.fversioning_initializing = False

    @classmethod
    def __instance_load(cls, target, *args, **kwargs):
        assert target.fversioning_initializing
        target.fversioning_initializing = False

    @classmethod
    def __mapper_configured(cls, *args):
        cls.__setup_metadata()

        cls.fversioning_queries = ExtensionQueries(
            VersioningTables(cls.__table__, cls.fversioning_etab, cls.fversioning_htab),
            has_id=cls.fversioning_has_id,
            cols=cls.fversioning_cols,
        )

        for col in cls.fversioning_cols:
            listener = partial(cls.__attribute_set, col=col)
            event.listen(getattr(cls, col), "set", listener, propagate=True)

    @classmethod
    def __attribute_set(cls, target, value, oldvalue, initiator, *, col):
        if target.fversioning_initializing:
            return

        session = sa.inspect(target).session
        resource = target.resource
        assert session and resource

        if (
            not session._flushing
            and not target.fversioning_vobj
            and IVersionableFeatureLayer.providedBy(resource)
            and resource.fversioning
        ):
            target.fversioning_track(resource)

    @classmethod
    def __mapper_hook(cls, mapper, connection, target, *, hook):
        if hook == "before_delete" and not target.fversioning_vobj:
            # Prevent deletion without versioning context
            insp = inspect(target)
            assert "resource_id" not in insp.unloaded
            resource = target.resource
            assert target.resource

            if (
                IVersionableFeatureLayer.providedBy(resource)
                and (fversioning := resource.fversioning) is not None
            ):
                deleted = insp.session.deleted
                if fversioning not in deleted and resource not in deleted:
                    raise VersioningContextRequired

        if (vobj := target.fversioning_vobj) is None:
            return

        params = dict()
        if target.fversioning_has_id:
            params["p_eid"] = target.id

        params.update(
            p_rid=target.resource_id,
            p_fid=target.feature_id,
            p_vid=vobj.version_id,
        )

        query = getattr(target.fversioning_queries, hook)
        connection.execute(query, params)
        target.fversioning_vobj = None


@event.listens_for(FVersioningMeta, "after_insert")
def _initfill_enabled_extensions(mapper, connection, obj):
    params = dict(p_rid=obj.resource_id, p_vid=1, p_vop="E")
    for cls in FVersioningExtensionMixin.fversioning_registry.values():
        query = cls.fversioning_queries.initfill
        connection.execute(query, params)


@event.listens_for(FVersioningObj, "after_insert")
@event.listens_for(FVersioningObj, "after_update")
def _delete_orphaned_feature_extensions(mapper, connection, target: FVersioningObj):
    params = dict(p_rid=target.resource_id, p_vid=target.version_id, p_vop="O")

    if fids := target.features_deleted:
        for cls in FVersioningExtensionMixin.fversioning_registry.values():
            query = cls.fversioning_queries.delete_ctab
            for fid in fids:
                connection.execute(query, dict(params, p_fid=fid))
        fids[:] = []

    # TODO: Restore extensions on feature restore

    target.unflushed_changes = False
