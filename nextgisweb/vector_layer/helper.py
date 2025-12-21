from collections.abc import Sequence
from typing import Literal, Union

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


class SetupFieldsResult(Struct, kw_only=True):
    present: Sequence[VectorLayerField]
    absent: Sequence[VectorLayerField]
    added: Sequence[VectorLayerField]


def setup_fields(
    res: VectorLayer,
    fields: Sequence[FieldDefn],
    *,
    destructive: bool = False,
) -> SetupFieldsResult:
    """Synchronize the fields of a VectorLayer with the provided definitions

    Add or update fields in the VectorLayer based on the given sequence of FieldDefn objects. If
    a field does not exist, add it to the VectorLayer. If a field exists, update its attributes if
    necessary. If `destructive` is True, remove fields from the VectorLayer that are not
    present in the field definitions.

    :param res: VectorLayer instance to be synchronized
    :param fields: Sequence of FieldDefn objects defining the desired fields
    :param destructive: Remove or not fields not present in `fields` (default is False)
    """

    rest = {f.keyname: f for f in res.fields}
    attrs = ("display_name", "grid_visibility", "text_search", "lookup_table")

    present = list()
    added = list()

    ordered = []
    for fd in fields:
        if fld := rest.pop(fd.keyname, None):
            present.append(fld)
        else:
            fld = VectorLayerField(keyname=fd.keyname, datatype=fd.datatype)
            res.fields.append(fld)
            added.append(fld)

        ordered.append(fld)
        for a in attrs:
            if (v := getattr(fd, a)) is not UNSET:
                if getattr(fld, a) != v:
                    setattr(fld, a, v)

        if fd.label_field is True:
            res.feature_label_field = fld

    absent = list(rest.values())
    if destructive:
        for fld in absent:
            res.fields.remove(fld)
    else:
        # Place absent fields in the end
        ordered.extend(absent)

    res.fields.sort(key=lambda fld: ordered.index(fld))

    return SetupFieldsResult(
        present=present,
        absent=absent,
        added=added,
    )
