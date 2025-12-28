import dataclasses as dc
import re
from functools import cached_property, lru_cache
from typing import Iterable, Literal

from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.schema import (
    AddConstraint,
    CheckConstraint,
    Column,
    CreateIndex,
    CreateSequence,
    CreateTable,
    DDLElement,
    DropConstraint,
    DropSequence,
    DropTable,
    ForeignKeyConstraint,
    Index,
    MetaData,
    Sequence,
    Table,
)
from sqlalchemy.sql import (
    alias,
    bindparam,
    delete,
    func,
    insert,
    literal_column,
    select,
    text,
    union_all,
    update,
)
from sqlalchemy.sql import and_ as sql_and
from sqlalchemy.sql import cast as sql_cast
from sqlalchemy.sql import or_ as sql_or
from sqlalchemy.sql.elements import BindParameter
from sqlalchemy.types import CHAR, Integer

from nextgisweb.lib import saext

from .util import SCHEMA


class VLSchema(MetaData):
    def __init__(self, *, tbl_uuid, versioning, geom_column_type, fields, schema=SCHEMA):
        super().__init__(schema=schema)
        self.tbl_uuid = tbl_uuid
        self.versioning = versioning
        self.geom_column_type = geom_column_type
        self.fields = fields

    @cached_property
    def cseq(self):
        return Sequence(
            self._table_name("id_seq"),
            start=1,
            minvalue=-(2**31),
            metadata=self,
        )

    def cseq_fn(self):
        return ".".join(([self.schema] if self.schema else []) + [self.cseq.name])

    @cached_property
    def cnextval(self):
        return text(f"nextval('{self.cseq_fn()}')")

    @cached_property
    def ctab(self):
        fields_columns, fields_mapping = self._columns_from_fields()
        result = FieldsTable(
            self._table_name(),
            self,
            Column("id", Integer, self.cseq, key="fid", primary_key=True),
            self._geom_column(),
            *fields_columns,
            self._geom_index(),
        )
        result._fields = fields_mapping
        return result

    @cached_property
    def ctab_fk(self):
        return ForeignKeyConstraint(
            ["fid"],
            [self.etab.c.fid],
            deferrable=True,
            initially="DEFERRED",
            table=self.ctab,
            name=self._table_name() + "_id_fk",
        )

    @cached_property
    def etab(self):
        table_name = self._table_name("e")
        fid = self._fid_column(autoincrement=False)
        vid = self._vid_column(primary_key=False)
        vop = Column("vop", CHAR(1), nullable=False)
        return Table(
            *(table_name, self, fid, vid, vop),
            Index(f"{table_name}_vid_fid_idx", vid, fid),
        )

    @cached_property
    def htab(self):
        fields_columns, fields_mapping = self._columns_from_fields()
        table_name = self._table_name("h")
        vid = self._vid_column(primary_key=True)
        fid = self._fid_column()
        nid = Column("nid", Integer, CheckConstraint("nid > vid"), nullable=False)
        vop = Column("vop", CHAR(1), nullable=False)
        nop = Column("nop", CHAR(1), nullable=False)
        geom = self._geom_column()
        result = FieldsTable(
            *(table_name, self, vid, fid, nid, vop, nop, geom),
            *fields_columns,
            Index(f"{table_name}_fid_vid_idx", fid, vid),
            ExcludeConstraint(
                (literal_column("int4range(vid, nid)"), "&&"),
                (literal_column("int4range(fid, fid, '[]')"), "&&"),
                name=f"{table_name}_vid_nid_fid_idx",
            ),
        )
        result._fields = fields_mapping
        return result

    # DDL generation

    def sql_create(self):
        yield CreateSequence(self.cseq)
        for tab in self._iter_tabs():
            yield from _create_table_and_indexes(tab)
        if self.versioning:
            yield AddConstraint(self.ctab_fk)

    def sql_drop(self):
        if self.versioning:
            yield DropConstraint(self.ctab_fk)
        yield from (DropTable(t) for t in reversed(list(self._iter_tabs())))
        yield DropSequence(self.cseq)

    def sql_versioning_enable(self):
        assert self.versioning
        for tab in self._iter_tabs(ctab=False):
            yield from _create_table_and_indexes(tab)
        yield self.dml_initfill()
        yield AddConstraint(self.ctab_fk)

    def sql_versioning_disable(self):
        assert not self.versioning
        yield DropConstraint(self.ctab_fk)
        tabs = reversed(list(self._iter_tabs(versioning=True, ctab=False)))
        yield from (DropTable(t) for t in tabs)

    def sql_convert_geom_column_type(self, new_value):
        assert not self.versioning
        yield AlterGeomColumn(self.ctab, self.geom_column_type, new_value)

    def sql_add_fields(self, fields):
        tabs = (self.ctab, self.htab) if self.versioning else (self.ctab,)
        for tab in tabs:
            yield AlterFieldsColumns(
                tab,
                [tab.fields[i] for i in fields],
                action="ADD",
            )

    def sql_delete_fields(self, fields):
        tabs = (self.ctab, self.htab) if self.versioning else (self.ctab,)
        for tab in tabs:
            yield AlterFieldsColumns(
                tab,
                [tab.fields[i] for i in fields],
                action="DROP",
            )

    # Queries

    def query_pit(self, version, *, subquery="pit", where=lambda s: ()):
        ct, et, ht = self._aliased_tabs()
        vid = version if isinstance(version, BindParameter) else bindparam("vid", version)

        qh = select(ht.c.fid, ht.c.vid).where(ht.c.vop != _lc_op_del)
        qh = qh.add_columns(
            ht.c.geom,
            *(fc.label(f"fld_{idx}") for idx, fc in enumerate(ht.fields.values(), start=1)),
        )
        qh = qh.where(literal_column("int4range(vid, nid)").op("@>", precedence=4)(vid))
        qh = qh.where(*where(ht))

        qe = select(et.c.fid, et.c.vid)
        qe = qe.add_columns(
            ct.c.geom,
            *(fc.label(f"fld_{idx}") for idx, fc in enumerate(ct.fields.values(), start=1)),
        )
        qe = qe.where(et.c.vid <= vid)
        qe = qe.join(ct, ct.c.fid == et.c.fid)
        qe = qe.where(*where(et))

        qu = union_all(qh, qe).subquery(subquery)
        fnames = {k: f"fld_{idx}" for idx, k in enumerate(ct.fields.keys(), start=1)}
        qu.fields = {k: qu.c[n] for k, n in fnames.items()}
        return qu

    def query_revert(self, version, *, where=lambda s: ()):
        et, ht = self._aliased_tabs()[1:]
        vid = version if isinstance(version, BindParameter) else bindparam("vid", version)

        q = (
            select(
                et.c.fid,
                literal_column("et.vop != 'D'").label("current"),
                literal_column("COALESCE(ht.vop != 'D', FALSE)").label("previous"),
            )
            .where(et.c.vid > vid)
            .select_from(et)
            .join(
                ht,
                sql_and(
                    ht.c.fid == et.c.fid,
                    literal_column("int4range(ht.vid, ht.nid)").op("@>", precedence=4)(vid),
                ),
                isouter=True,
            )
        )
        q = q.add_columns(
            ht.c.geom,
            *(fc.label(f"fld_{idx}") for idx, fc in enumerate(ht.fields.values(), start=1)),
        ).subquery("sub")

        q = select(
            q.c.fid,
            q.c.current,
            q.c.previous,
            q.c.geom,
            *(getattr(q.c, f"fld_{idx}") for idx, fc in enumerate(ht.fields.values(), start=1)),
        ).where(text("current != previous OR (current AND previous)"))

        fnames = {k: f"fld_{idx}" for idx, k in enumerate(ht.fields.keys(), start=1)}
        q.fields = {k: q.selected_columns[n] for k, n in fnames.items()}
        return q

    def query_changed_fids(self):
        et, ht = self.etab.alias("et"), self.htab.alias("ht")
        p_initial, p_target = bindparam("p_initial"), bindparam("p_target")
        p_fid_limit, p_fid_last = bindparam("p_fid_limit"), bindparam("p_fid_last")

        for t in (et, ht):
            vid, fid = t.c.vid, t.c.fid
            yield (
                select(fid.distinct().label("fid"))
                .where(
                    vid > p_initial,
                    vid <= p_target,
                    sql_or(p_fid_last.is_(None), fid > p_fid_last),
                )
                .order_by(fid)
                .limit(p_fid_limit)
            )

    def query_changes(self, *, summary=False):
        ct, et, ht = self._aliased_tabs()
        p_initial, p_target = bindparam("p_initial"), bindparam("p_target")
        p_fid_min, p_fid_max = bindparam("p_fid_min"), bindparam("p_fid_max")

        lc_fields, fmap = list(), dict()
        for idx, (fk, fv) in enumerate(self.fields.items(), start=1):
            lc_fields.append(literal_column(f"fld_{fv[0]}").label(f"fld_{idx}"))
            fmap[fk] = idx
        field_count = len(lc_fields)

        where_range = literal_column("int4range(vid, nid)").op("@>", precedence=4)
        where_fid = lambda s: (s.c.fid >= p_fid_min, s.c.fid <= p_fid_max)

        # Initial version (without etab)
        qi = (
            select(
                *(ht.c.fid, ht.c.vid),
                ht.c.vop.op("=")(_lc_op_del).label("deleted"),
                *(ht.c.geom, *lc_fields),
            )
            .where(where_range(p_initial), *where_fid(ht))
            .subquery("qi")
        )

        # Target version
        qt = union_all(
            select(
                *(et.c.fid, et.c.vid),
                ct.c.fid.is_(None).label("deleted"),
                *(ct.c.geom, *lc_fields),
            )
            .join(ct, ct.c.fid == et.c.fid, isouter=True)
            .where(et.c.vid > p_initial, et.c.vid <= p_target, *where_fid(et)),
            select(
                *(ht.c.fid, ht.c.vid),
                ht.c.vop.op("=")(_lc_op_del).label("deleted"),
                *(ht.c.geom, *lc_fields),
            ).where(where_range(p_target), *where_fid(ht)),
        ).subquery("qt")

        if not summary:
            q = select(
                *_lc_changes_head,
                _lc_changes_bits(field_count),
                _lc_changes_geom(),
                *_lc_changes_fields(field_count),
            ).order_by(_lc_changes_fid.asc())
        else:
            q = select(_lc_changes_act, _lc_count_cnt).group_by(_lc_op)

        q = q.select_from(
            qi.join(qt, qi.c.fid == qt.c.fid, full=True)
            .join(_lat_changes_p(), _sql_true)
            .join(_lat_changes_d(field_count), _sql_true)
            .join(_lat_changes_u(field_count), _sql_true)
        ).where(text("pi != pt OR upd"))

        return q, fmap

    # DML

    def dml_insert(self, *, fields=None, with_fid=False):
        bmap, values = dict(), dict()
        values["fid"] = bindparam("p_fid") if with_fid else self.cnextval
        values["geom"] = self._geom_value()

        ct = self.ctab
        for idx, (k, v) in enumerate(ct.fields.items(), start=1):
            if fields is None or k in fields:
                bmap[k] = bpn = f"fld_{idx}"
                values[v.name] = bindparam(bpn)

        ict = insert(ct).values(**values)

        if not self.versioning:
            return ict.returning(ct.c.fid), bmap

        # Versioning
        et, vid = self.etab, bindparam("vid")
        ict = ict.returning(
            ct.c.fid.label("fid"),
            vid.label("vid"),
            _lc_op_ins.label("vop"),
        ).cte("ict")
        iet = insert(et).from_select(["fid", "vid", "vop"], ict)
        iet = iet.returning(et.c.fid.label("id"))
        return iet, bmap

    def dml_update(self, *, id, with_geom, fields=None, geom_raw=False):
        ct = self.ctab
        bmap, values, dif = dict(), dict(), list()

        if with_geom:
            values["geom"] = geom_value = self._geom_value(raw=geom_raw)
            dif.append(geom_value.is_distinct_from(_lc_geom))

        for idx, (k, v) in enumerate(ct.fields.items(), start=1):
            if fields is None or k in fields:
                bmap[k] = bpn = f"fld_{idx}"
                values[v.name] = bp = bindparam(bpn)
                dif.append(sql_cast(bp, v.type).is_distinct_from(literal_column(v.name)))

        if len(values) == 0:
            # Do nothing, need to comply UPDATE syntax
            values["fid"] = ct.c.fid

        uct = update(ct).values(**values)
        uct = uct.where(ct.c.fid == id)
        if len(dif) > 0:
            uct = uct.where(sql_or(*dif))

        if not self.versioning:
            return uct.returning(ct.c.fid), bmap

        # Versioning
        et, ht, vid = self.etab, self.htab, bindparam("vid")
        uct = uct.returning(ct.c.fid).cte("uct")

        ihs = select(
            uct.c.fid.label("fid"),
            et.c.vid,
            vid.label("nid"),
            et.c.vop,
            _lc_op_upd.label("nop"),
            ct.c.geom,
        ).select_from(uct.join(et, et.c.fid == uct.c.fid).join(ct, ct.c.fid == et.c.fid))
        ihs = ihs.add_columns(*ct.fields.values())

        cls = ["fid", "vid", "nid", "vop", "nop", "geom"] + [f.name for f in ct.fields.values()]
        iht = insert(ht).from_select(cls, ihs).returning(ht.c.fid).cte("iht")

        uet = update(et).values(vid=vid, vop=_lc_op_upd).where(iht.c.fid == et.c.fid)
        return uet.returning(et.c.fid.label("id")), bmap

    def dml_delete(self, *, filter_by):
        ct = self.ctab
        dct = delete(ct).filter_by(**filter_by)

        if not self.versioning:
            return dct.returning(ct.c.fid)

        # Versioning
        et, ht, vid = self.etab, self.htab, bindparam("vid")
        dct = dct.returning(ct.c.fid).cte("dct")

        ihs = select(
            dct.c.fid.label("fid"),
            et.c.vid,
            vid.label("nid"),
            et.c.vop,
            _lc_op_del.label("nop"),
            ct.c.geom,
        ).select_from(dct.join(et, et.c.fid == dct.c.fid).join(ct, ct.c.fid == et.c.fid))
        ihs = ihs.add_columns(*ct.fields.values())

        cls = ["fid", "vid", "nid", "vop", "nop", "geom"] + [f.name for f in ct.fields.values()]
        iht = insert(ht).from_select(cls, ihs).returning(ht.c.fid).cte("iht")

        uet = update(et).values(vid=vid, vop=_lc_op_del)
        uet = uet.where(iht.c.fid == et.c.fid)
        return uet.returning(iht.c.fid.label("id"))

    def dml_restore(self, *, with_geom, fields=None, geom_raw=False):
        bmap = dict()
        ct, et, ht = self.ctab, self.etab, self.htab
        fid, vid = bindparam("p_fid"), bindparam("p_vid")

        qet = select(et.c.fid, et.c.vid).where(et.c.fid == fid, et.c.vop == _lc_op_del)
        qet = qet.cte("qet")

        cht = [self._geom_value(raw=geom_raw).label("geom") if with_geom else ht.c.geom]
        for idx, (k, v) in enumerate(ct.fields.items(), start=1):
            if fields is None or k in fields:
                bmap[k] = bpn = f"fld_{idx}"
                bp = bindparam(bpn).label(v.name)
            else:
                bp = literal_column(v.name)
            cht.append(sql_cast(bp, v.type))

        sht = select(ht.c.fid, ht.c.nid, ht.c.nop, *cht)
        hir = func.int4range(ht.c.vid, ht.c.nid)
        eir = func.int4range(qet.c.vid.op("-")(_sql_one), qet.c.vid)
        sht = sht.where(ht.c.fid == qet.c.fid, hir.op("&&")(eir))
        sht = sht.cte("sht")

        iht = (
            insert(ht)
            .from_select(
                ["fid", "vid", "nid", "vop", "nop"],
                select(sht.c.fid, sht.c.nid, vid, sht.c.nop, _lc_op_rst),
            )
            .returning(ht.c.fid)
            .cte("iht")
        )

        ict = insert(ct).from_select(
            ["fid", "geom"] + [f.name for f in ct.fields.values()],
            select(sht.c.fid, sht.c.geom, *(literal_column(f.name) for f in ct.fields.values())),
        )
        ict = ict.returning(ct.c.fid).cte("ict")

        uet = update(et).values(vid=vid, vop=_lc_op_rst)
        uet = uet.where(et.c.fid == ict.c.fid)
        uet = uet.where(iht.c.fid == ict.c.fid)
        return uet.returning(et.c.fid.label("id")), bmap

    def dml_initfill(self):
        assert self.versioning
        ct, et = self.ctab, self.etab
        vid = bindparam("vid", 1)
        sel_e = select(ct.c.fid, vid.label("vid"), _lc_op_ins)
        ins_e = insert(et).from_select(["fid", "vid", "vop"], sel_e)
        return ins_e

    def dml_reset_seq(self):
        fid = self.ctab.c.fid if not self.versioning else self.etab.c.fid
        sub = select(func.max(fid).label("fid")).scalar_subquery()
        return select(
            func.setval(
                text(f"'{self.cseq_fn()}'"),
                func.coalesce(sub, text("0")),
            ).label("fid")
        )

    # Utilities

    def _table_name(self, suffix=None):
        return "layer_" + self.tbl_uuid + (f"_{suffix}" if suffix else "")

    def _iter_tabs(self, *, versioning=None, ctab=True):
        if ctab:
            yield self.ctab
        versioning = self.versioning if versioning is None else versioning
        if versioning:
            for i in ("e", "h"):
                yield getattr(self, f"{i}tab")

    def _fid_column(self, *args, **kwargs):
        return Column("fid", Integer, *args, primary_key=True, **kwargs)

    def _vid_column(self, *, primary_key):
        return Column(
            "vid",
            Integer,
            primary_key=primary_key,
            nullable=False,
        )

    def _nid_column(self):
        return Column(
            "nid",
            Integer,
            CheckConstraint("nid > vid"),
            nullable=False,
        )

    def _geom_column(self, **kwargs):
        args = (self.geom_column_type,) if self.geom_column_type else ()
        return Column("geom", *args, **kwargs)

    def _geom_index(self):
        return Index(
            f"idx_{self._table_name()}_geom",
            "geom",
            postgresql_using="gist",
        )

    def _geom_value(self, name="geom", raw=False):
        return (
            bindparam(name)
            if raw
            else func.ST_GeomFromWKB(
                bindparam(name),
                text(str(self.geom_column_type.srid)),
            )
        )

    def _columns_from_fields(self):
        fields_columns = list()
        fields_mapping = dict()
        for fk, fld in self.fields.items():
            fcol = Column(f"fld_{fld[0]}", *fld[1:])
            fields_columns.append(fcol)
            fields_mapping[fk] = fcol.name
        return fields_columns, fields_mapping

    def _aliased_tabs(self):
        return (
            alias(self.ctab, "ct"),
            alias(self.etab, "et"),
            alias(self.htab, "ht"),
        )


def _create_table_and_indexes(tab):
    yield CreateTable(tab)
    for idx in tab.indexes:
        yield CreateIndex(idx)


_sql_true = text("TRUE")
_sql_one = text("1")

_lc_geom = literal_column("geom")
_lc_op_ins = literal_column("'С'")
_lc_op_upd = literal_column("'U'")
_lc_op_del = literal_column("'D'")
_lc_op_rst = literal_column("'R'")

_lc_changes_fid = literal_column("COALESCE(qi.fid, qt.fid)").label("fid")
_lc_changes_act = literal_column(
    "CASE "
    "WHEN NOT pi AND pt AND NOT di THEN 'C' "
    "WHEN pi AND pt AND upd THEN 'U' "
    "WHEN pi AND NOT pt THEN 'D' "
    "WHEN NOT pi AND pt AND di THEN 'R' "
    "END"
).label("op")

_lc_op = literal_column("op").label("op")
_lc_count_cnt = literal_column("COUNT(*)").label("cnt")

_lc_changes_head = (
    _lc_changes_fid,
    literal_column("qt.vid").label("vid"),
    _lc_changes_act,
)


@lru_cache
def _lc_changes_geom():
    lc = literal_column("CASE WHEN dif_geom THEN ST_AsBinary(qt.geom, 'NDR') END")
    return lc.label("geom")


@lru_cache
def _lc_changes_fields(count):
    return tuple(
        literal_column(f"CASE WHEN dif_{i} THEN qt.fld_{i} END").label(f"fld_{i}")
        for i in range(1, count + 1)
    )


@lru_cache
def _lc_changes_bits(count):
    cols = ["dif_geom", *(f"dif_{i}" for i in range(1, count + 1))]
    cols = [f"CASE WHEN {c} THEN '1' ELSE '0' END" for c in cols]
    # NOTE: CONCAT fails here if len(cols) > 100
    return literal_column(" || ".join(cols)).label("bits")


@lru_cache
def _lat_changes_p():
    return select(
        literal_column("qi.fid IS NOT NULL AND NOT qi.deleted").label("pi"),
        literal_column("qi.fid IS NOT NULL AND qi.deleted").label("di"),
        literal_column("qt.fid IS NOT NULL AND NOT qt.deleted").label("pt"),
    ).lateral("lat_p")


@lru_cache
def _lat_changes_d(count):
    tmpl = "pt AND (NOT pi OR qt.{c} IS DISTINCT FROM qi.{c})"
    lc_geom = literal_column(tmpl.format(c="geom"))
    return select(
        lc_geom.label("dif_geom"),
        *(
            literal_column(tmpl.format(c=f"fld_{i}")).label(f"dif_{i}")
            for i in range(1, count + 1)
        ),
    ).lateral("lat_d")


@lru_cache
def _lat_changes_u(count):
    cols = ("dif_geom", *(f"dif_{i}" for i in range(1, count + 1)))
    return select(
        literal_column(" OR ".join(cols)).label("upd"),
    ).lateral("lat_u")


class FieldsTable(Table):
    def alias(self, *args, **kwargs):
        obj = super().alias(*args, **kwargs)
        obj.fields = self._fields_mapping(obj)
        return obj

    @cached_property
    def fields(self):
        return self._fields_mapping(self)

    def _fields_mapping(self, table):
        return {
            field_key: table.columns[field_column_name]
            for field_key, field_column_name in self._fields.items()
        }


@dc.dataclass
class AlterGeomColumn(DDLElement):
    table: Table
    old_type: saext.Geometry
    new_type: saext.Geometry


@compiles(AlterGeomColumn)
def _compile_alter_geometry_column(element, compiler, **kw):
    regex = re.compile(r"(MULTI|)(POINT|LINESTRING|POLYGON)(Z|)")
    om, ob, oz = regex.match(element.old_type.geometry_type).groups()
    nm, nb, nz = regex.match(element.new_type.geometry_type).groups()

    if nb != ob:
        raise ValueError(f"Incompatible base types: {nb} and {ob}")

    expr = _lc_geom

    if om == nm:
        pass
    elif om == "MULTI":
        expr = func.ST_GeometryN(expr, _sql_one)
    elif nm == "MULTI":
        expr = func.ST_Multi(expr)
    else:
        raise NotImplementedError

    if oz == nz:
        pass
    elif oz == "Z":
        expr = func.ST_Force2D(expr)
    elif nz == "Z":
        expr = func.ST_Force3D(expr)
    else:
        raise NotImplementedError

    return "ALTER TABLE {} ALTER COLUMN geom TYPE {} USING {}".format(
        compiler.preparer.format_table(element.table),
        element.new_type.compile(compiler.dialect),
        expr,
    )


@dc.dataclass
class AlterFieldsColumns(DDLElement):
    table: Table
    fields: Iterable[tuple[str, ...]]
    action: Literal["ADD", "DROP"]

    def _compile_column(self, column, *, compiler):
        if self.action == "ADD":
            return "ADD COLUMN " + compiler.get_column_specification(column)
        elif self.action == "DROP":
            return "DROP COLUMN " + compiler.preparer.format_column(column)
        raise ValueError


@compiles(AlterFieldsColumns)
def _compile_alter_field_columns(element, compiler, **kwargs):
    field_to_sql = lambda f: element._compile_column(f, compiler=compiler)
    return "ALTER TABLE {table} {operations}".format(
        table=compiler.preparer.format_table(element.table),
        operations=", ".join(field_to_sql(fld) for fld in element.fields),
    )
