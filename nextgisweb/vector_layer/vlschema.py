import dataclasses as dc
import re
from functools import cached_property
from types import MappingProxyType
from typing import Any, Iterable, Literal, Tuple, Union, cast

import sqlalchemy as sa
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.schema import CreateSequence, CreateTable, DropSequence, DropTable

from nextgisweb.lib import saext

from .util import SCHEMA


class VLSchema(sa.MetaData):
    def __init__(self, *, tbl_uuid, geom_column_type, fields):
        super().__init__(schema=SCHEMA)
        self.tbl_uuid = tbl_uuid
        self.geom_column_type = geom_column_type
        self.fields = fields

    @cached_property
    def cseq(self):
        return sa.Sequence(
            f"layer_{self.tbl_uuid}_id_seq",
            start=1,
            minvalue=-(2**31),
            metadata=self,
        )

    @cached_property
    def cnextval(self):
        return sa.text(f"nextval('{SCHEMA}.{self.cseq.name}')")

    @cached_property
    def ctab(self):
        fields_columns, fields_mapping = self._columns_from_fields()
        result = FieldsTable(
            f"layer_{self.tbl_uuid}",
            self,
            self._id_column(),
            self._geom_column(),
            *fields_columns,
            self._geom_index(),
        )
        result._fields = fields_mapping
        return result

    def sql_create(self):
        yield CreateSequence(self.cseq)
        yield CreateTable(self.ctab)

    def sql_drop(self):
        yield DropTable(self.ctab)
        yield DropSequence(self.cseq)

    def sql_convert_geom_column_type(self, new_value):
        yield AlterGeomColumn(self.ctab, self.geom_column_type, new_value)

    def sql_add_fields(self, fields):
        yield AlterFieldsColumns(
            self.ctab,
            [self.ctab.fields[i] for i in fields],
            action="ADD",
        )

    def sql_delete_fields(self, fields):
        yield AlterFieldsColumns(
            self.ctab,
            [self.ctab.fields[i] for i in fields],
            action="DROP",
        )

    def _id_column(self):
        return sa.Column("id", sa.Integer, self.cseq, primary_key=True)

    def _geom_column(self):
        args = (self.geom_column_type,) if self.geom_column_type else ()
        return sa.Column("geom", *args)

    def _geom_index(self):
        return sa.Index(
            f"idx_layer_{self.tbl_uuid}_geom",
            "geom",
            postgresql_using="gist",
        )

    def _columns_from_fields(self):
        fields_columns = list()
        fields_mapping = dict()
        for fk, fld in self.fields.items():
            fcol = sa.Column(f"fld_{fld[0]}", *fld[1:])
            fields_columns.append(fcol)
            fields_mapping[fk] = fcol.name
        return fields_columns, fields_mapping


class FieldsTable(sa.Table):
    def alias(self, *args, **kwargs):
        obj = super().alias(*args, **kwargs)
        obj.fields = self._fields_mapping(obj)
        return obj

    @cached_property
    def fields(self):
        return self._fields_mapping(self)

    def _fields_mapping(self, table):
        return MappingProxyType(
            {
                field_key: table.columns[field_column_name]
                for field_key, field_column_name in self._fields.items()
            }
        )


@dc.dataclass
class AlterGeomColumn(sa.schema.DDLElement):
    table: sa.Table
    old_type: saext.Geometry
    new_type: saext.Geometry


@compiles(AlterGeomColumn)
def _compile_alter_geometry_column(element, compiler, **kw):
    regex = re.compile(r"(MULTI|)(POINT|LINESTRING|POLYGON)(Z|)")
    om, ob, oz = regex.match(element.old_type.geometry_type).groups()
    nm, nb, nz = regex.match(element.new_type.geometry_type).groups()

    if nb != ob:
        raise ValueError(f"Incompatible base types: {nb} and {ob}")

    expr = {
        ("", "MULTI"): lambda e: sa.func.ST_Multi(e),
        ("MULTI", ""): lambda e: sa.func.ST_GeometryN(e, sa.text("1")),
        ("", ""): lambda e: e,
    }[cast(Any, (om, nm))](sa.text("geom"))

    expr = {
        ("", "Z"): lambda e: sa.func.ST_Force3D(e),
        ("Z", ""): lambda e: sa.func.ST_Force2D(e),
        ("", ""): lambda e: e,
    }[cast(Any, (oz, nz))](expr)

    return "ALTER TABLE {} ALTER COLUMN geom TYPE {} USING {}".format(
        compiler.preparer.format_table(element.table),
        element.new_type.compile(compiler),
        expr,
    )


@dc.dataclass
class AlterFieldsColumns(sa.schema.DDLElement):
    table: sa.Table
    fields: Iterable[Tuple[str, ...]]
    action: Union[Literal["ADD"], Literal["DROP"]]

    def _compile_column(self, column, *, compiler):
        if self.action == "ADD":
            return "ADD COLUMN " + compiler.get_column_specification(column)
        elif self.action == "DROP":
            return "DROP COLUMN " + compiler.preparer.format_column(column)
        raise ValueError(f"Unknown action: {self.action}")


@compiles(AlterFieldsColumns)
def _compile_alter_field_columns(element, compiler, **kw):
    field_to_sql = lambda f: element._compile_column(f, compiler=compiler)
    return "ALTER TABLE {table} {operations}".format(
        table=compiler.preparer.format_table(element.table),
        operations=", ".join(field_to_sql(fld) for fld in element.fields),
    )
