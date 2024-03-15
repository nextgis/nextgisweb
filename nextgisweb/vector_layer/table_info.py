"""Shim for legacy TableInfo class which is used by some extensions"""
from dataclasses import dataclass


@dataclass
class FieldDef:
    key: str
    keyname: str


class TableInfo:
    def __init__(self, res):
        vls = res.vlschema()
        self.table = vls.ctab
        self.id_column = self.table.columns.fid
        self.geom_column = self.table.columns.geom
        self.fields = [FieldDef(f"fld_{f.fld_uuid}", f.keyname) for f in res.fields]

    @classmethod
    def from_layer(cls, res):
        return cls(res)

    def setup_metadata(self, *args, **kwargs):
        pass
