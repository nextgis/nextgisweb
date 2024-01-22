import uuid

import geoalchemy2 as ga
from sqlalchemy.orm import registry

from nextgisweb.env import env
from nextgisweb.lib import db

from nextgisweb.core.exception import ValidationError as VE
from nextgisweb.feature_layer import GEOM_TYPE

from .util import FIELD_TYPE_2_DB, GEOM_TYPE_2_DB, SCHEMA


class FieldDef:
    def __init__(
        self,
        key,
        keyname,
        datatype,
        uuid,
        display_name=None,
        label_field=None,
        grid_visibility=None,
        ogrindex=None,
        origtype=None,
    ):
        self.key = key
        self.keyname = keyname
        self.datatype = datatype
        self.uuid = uuid
        self.display_name = display_name
        self.label_field = label_field
        self.grid_visibility = grid_visibility
        self.ogrindex = ogrindex
        self.origtype = origtype


class TableInfo:
    def __init__(self, srs):
        self.srs = srs
        self.metadata = None
        self.table = None
        self.model = None
        self.id_column = None
        self.geom_column = None
        self.fields = []
        self.fid_field_index = None
        self.fid_field_origtype = None
        self.geometry_type = None

    @classmethod
    def from_fields(cls, fields, srs, geometry_type):
        self = cls(srs)
        self.geometry_type = geometry_type

        for fld in fields:
            uid = uuid.uuid4().hex
            self.fields.append(
                FieldDef(
                    "fld_%s" % uid,
                    fld.get("keyname"),
                    fld.get("datatype"),
                    uid,
                    fld.get("display_name"),
                    fld.get("label_field"),
                    fld.get("grid_visibility"),
                )
            )

        return self

    @classmethod
    def from_layer(cls, layer):
        self = cls(layer.srs)

        self.geometry_type = layer.geometry_type

        for f in layer.fields:
            self.fields.append(FieldDef("fld_%s" % f.fld_uuid, f.keyname, f.datatype, f.fld_uuid))

        return self

    def find_field(self, keyname=None, ogrindex=None):
        for f in self.fields:
            if keyname is not None and f.keyname == keyname:
                return f
            if ogrindex is not None and f.ogrindex == ogrindex:
                return f

    def setup_layer(self, layer):
        layer.geometry_type = self.geometry_type

        layer.fields = []
        _keynames = []
        _display_names = []
        for f in self.fields:
            if f.display_name is None:
                f.display_name = f.keyname

            # Check unique names
            if f.keyname in _keynames:
                raise VE(message="Field keyname (%s) is not unique." % f.keyname)
            if f.display_name in _display_names:
                raise VE(message="Field display_name (%s) is not unique." % f.display_name)
            _keynames.append(f.keyname)
            _display_names.append(f.display_name)

            field = layer.__field_class__(
                keyname=f.keyname,
                datatype=f.datatype,
                display_name=f.display_name,
                fld_uuid=f.uuid,
            )
            if f.grid_visibility is not None:
                field.grid_visibility = f.grid_visibility

            layer.fields.append(field)

            if f.label_field:
                layer.feature_label_field = field

    def setup_metadata(self, tablename):
        metadata = db.MetaData(schema=SCHEMA)
        metadata.bind = env.core.engine
        geom_fldtype = GEOM_TYPE_2_DB[self.geometry_type]

        class model:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

        sequence = db.Sequence(
            tablename + "_id_seq", start=1, minvalue=-(2**31), metadata=metadata
        )
        table = db.Table(
            tablename,
            metadata,
            db.Column("id", db.Integer, sequence, primary_key=True),
            db.Column(
                "geom",
                ga.Geometry(
                    dimension=3 if self.geometry_type in GEOM_TYPE.has_z else 2,
                    srid=self.srs.id,
                    geometry_type=geom_fldtype,
                ),
            ),
            *map(lambda fld: db.Column(fld.key, FIELD_TYPE_2_DB[fld.datatype]), self.fields),
        )

        mapper_registry = registry()
        mapper_registry.map_imperatively(model, table)

        self.metadata = metadata
        self.sequence = sequence
        self.table = table
        self.model = model
        self.id_column = table.c.id
        self.geom_column = table.c.geom
