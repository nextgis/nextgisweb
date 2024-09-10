from typing import Literal, Sequence, Union

from msgspec import UNSET, Struct, UnsetType

from nextgisweb.lookup_table import LookupTable

from .model import VectorLayer, VectorLayerField


class FieldDefn(Struct, kw_only=True):
    keyname: str
    datatype: str
    display_name: str
    label_field: Union[Literal[True], UnsetType] = UNSET
    lookup_table: Union[LookupTable, None, UnsetType] = UNSET
    grid_visibility: Union[bool, UnsetType] = UNSET
    text_search: Union[bool, UnsetType] = UNSET


def setup_fields(res: VectorLayer, fields: Sequence[FieldDefn], *, destructive: bool = False):
    """Synchronize the fields of a VectorLayer with the provided definitions

    Add or update fields in the VectorLayer based on the given sequence of FieldDefn objects. If
    a field does not exist, add it to the VectorLayer. If a field exists, update its attributes if
    necessary. If `destructive` is True, remove fields from the VectorLayer that are not
    present in the field definitions.

    :param res: VectorLayer instance to be synchronized
    :param fields: Sequence of FieldDefn objects defining the desired fields
    :param destructive: Remove or not fields not present in `fields` (default is False)
    """

    existing = {f.keyname: f for f in res.fields}
    attrs = ("display_name", "grid_visibility", "text_search", "lookup_table")

    ordered = []
    for fd in fields:
        if (fld := existing.pop(fd.keyname, None)) is None:
            fld = VectorLayerField(keyname=fd.keyname, datatype=fd.datatype)
            res.fields.append(fld)

        ordered.append(fld)
        for a in attrs:
            if (v := getattr(fd, a)) is not UNSET:
                if getattr(fld, a) != v:
                    setattr(fld, a, v)

        if fd.label_field is True:
            res.feature_label_field = fld

    if destructive:
        for fld in existing.values():
            res.fields.remove(fld)
    else:
        ordered.extend(existing.values())

    res.fields.sort(key=lambda fld: ordered.index(fld))
