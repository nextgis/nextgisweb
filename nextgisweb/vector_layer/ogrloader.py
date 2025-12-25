from functools import partial
from itertools import product
from typing import Literal

import sqlalchemy as sa
from msgspec import Struct
from msgspec import field as msgspec_field
from osgeo import ogr, osr
from zope.interface import Attribute, Interface, implementer

from nextgisweb.env import gettext
from nextgisweb.lib.json import dumps
from nextgisweb.lib.ogrhelper import FIELD_GETTER

from nextgisweb.core.exception import ValidationError as VE
from nextgisweb.feature_layer import (
    FIELD_TYPE,
    GEOM_TYPE,
    GEOM_TYPE_2_WKB_TYPE,
    GEOM_TYPE_OGR,
    GEOM_TYPE_OGR_2_GEOM_TYPE,
)
from nextgisweb.feature_layer.util import unique_name
from nextgisweb.spatial_ref_sys import SRS

from .util import FIELD_TYPE_2_ENUM, FIELD_TYPE_SIZE, fix_encoding, utf8len

MIN_INT32 = -(2**31)
MAX_INT32 = 2**31 - 1
ERROR_LIMIT = 10

FixErrors = Literal["NONE", "SAFE", "LOSSY"]
FidSource = Literal["AUTO", "SEQUENCE", "FIELD"]
CastAutoYesNo = None | bool
CastGeometryType = None | Literal["POINT", "LINESTRING", "POLYGON"]


class FIX_ERRORS:
    NONE = "NONE"
    SAFE = "SAFE"
    LOSSY = "LOSSY"

    enum = (NONE, SAFE, LOSSY)


class FID_SOURCE:
    AUTO = "AUTO"
    SEQUENCE = "SEQUENCE"
    FIELD = "FIELD"

    enum = (AUTO, SEQUENCE, FIELD)


class TOGGLE:
    AUTO = None
    YES = True
    NO = False

    enum = (AUTO, YES, NO)


class LoaderParams(Struct, kw_only=True, frozen=True):
    fix_errors: FixErrors = "NONE"
    skip_errors: bool = False
    skip_other_geometry_types: bool = False
    fid_source: FidSource = "SEQUENCE"
    fid_field: list[str] = msgspec_field(default_factory=list)
    cast_geometry_type: CastGeometryType = None
    cast_is_multi: CastAutoYesNo = None
    cast_has_z: CastAutoYesNo = None
    validate: bool = True

    def __post_init__(self):
        if self.skip_other_geometry_types and self.cast_geometry_type is None:
            raise VE(
                "Parameter 'cast_geometry_type' is required with 'skip_other_geometry_types=true'."
            )


class LoaderField(Struct, kw_only=False):
    idx: int
    name: str
    origtype: int
    datatype: str


STRING_CAST_TYPES = (
    ogr.OFTIntegerList,
    ogr.OFTInteger64List,
    ogr.OFTRealList,
    ogr.OFTStringList,
)


class IExplorer(Interface):
    identity = Attribute("Explorer identity")

    def explore(self, feature):
        """Explore feature and returns True if done"""


@implementer(IExplorer)
class GeomTypeExplorer:
    identity = "geom_type"

    def __init__(self, geom_filter, params):
        self.geom_filter = geom_filter
        self.is_multi = False
        self.has_z = False
        self._params = params

    def explore(self, feature):
        geom = feature.GetGeometryRef()
        if geom is None:
            return False

        if geom.IsMeasured():
            geom.SetMeasured(False)

        gtype = geom.GetGeometryType()
        if (
            gtype in (ogr.wkbGeometryCollection, ogr.wkbGeometryCollection25D)
            and geom.GetGeometryCount() == 1
        ):
            geom = geom.GetGeometryRef(0)
            gtype = geom.GetGeometryType()

        if gtype not in GEOM_TYPE_OGR:
            return False
        geometry_type = GEOM_TYPE_OGR_2_GEOM_TYPE[gtype]

        if self._params.cast_geometry_type == TOGGLE.AUTO:
            for _geom_types in (
                GEOM_TYPE.points,
                GEOM_TYPE.linestrings,
                GEOM_TYPE.polygons,
            ):
                if geometry_type in _geom_types:
                    self.geom_filter = self.geom_filter.intersection(set(_geom_types))
                    break
        elif self._params.skip_other_geometry_types and geometry_type not in self.geom_filter:
            return False

        if (
            self._params.cast_is_multi == TOGGLE.AUTO
            and not self.is_multi
            and geometry_type in GEOM_TYPE.is_multi
        ):
            self.geom_filter = self.geom_filter.intersection(set(GEOM_TYPE.is_multi))
            self.is_multi = True

        if (
            self._params.cast_has_z == TOGGLE.AUTO
            and not self.has_z
            and geometry_type in GEOM_TYPE.has_z
        ):
            self.geom_filter = self.geom_filter.intersection(set(GEOM_TYPE.has_z))
            self.has_z = True

        return len(self.geom_filter) <= 1


@implementer(IExplorer)
class Int32RangeExplorer:
    identity = "int32_range"

    def __init__(self, field_index):
        self.result_ok = True
        self._field_index = field_index

    def explore(self, feature):
        i = self._field_index
        if feature.IsFieldSet(i) and not feature.IsFieldNull(i):
            fid = feature.GetFieldAsInteger64(i)
            if not (MIN_INT32 < fid < MAX_INT32):
                self.result_ok = False
                return True
        return False


@implementer(IExplorer)
class UniquenessExplorer:
    identity = "unique"

    def __init__(self, field_index, field_type):
        self.result_ok = True
        self._field_index = field_index
        self._field_getter = FIELD_GETTER[field_type]
        self._values = set()

    def explore(self, feature):
        i = self._field_index
        if not feature.IsFieldSet(i) or feature.IsFieldNull(i):
            self.result_ok = False
            return True

        value = self._field_getter(feature, i)

        if value in self._values:
            self.result_ok = False
            return True

        self._values.add(value)
        return False


class OGRLoader:
    geometry_type: str
    fid_field: LoaderField | None
    fields: dict[int, LoaderField]

    def __init__(self, ogrlayer, params: LoaderParams):
        self.ogrlayer = ogrlayer
        self.params = params
        self._scan()

    def _scan(self):
        ogrlayer = self.ogrlayer
        params = self.params

        defn = ogrlayer.GetLayerDefn()

        explorers = dict()

        def add_explorer(cls, *args):
            explorers[cls.identity] = cls(*args)

        # Geom type

        if params.cast_geometry_type == GEOM_TYPE.POINT:
            geom_filter = set(GEOM_TYPE.points)
        elif params.cast_geometry_type == GEOM_TYPE.LINESTRING:
            geom_filter = set(GEOM_TYPE.linestrings)
        elif params.cast_geometry_type == GEOM_TYPE.POLYGON:
            geom_filter = set(GEOM_TYPE.polygons)
        else:
            geom_filter = set(GEOM_TYPE.enum)

        if params.cast_is_multi == TOGGLE.NO:
            geom_filter -= set(GEOM_TYPE.is_multi)
        elif params.cast_is_multi == TOGGLE.YES:
            geom_filter = geom_filter.intersection(set(GEOM_TYPE.is_multi))

        if params.cast_has_z == TOGGLE.NO:
            geom_filter -= set(GEOM_TYPE.has_z)
        elif params.cast_has_z == TOGGLE.YES:
            geom_filter = geom_filter.intersection(set(GEOM_TYPE.has_z))

        ltype = ogrlayer.GetGeomType()

        geometry_type = None
        if len(geom_filter) == 1:
            geometry_type = geom_filter.pop()
        elif ltype in GEOM_TYPE_OGR and GEOM_TYPE_OGR_2_GEOM_TYPE[ltype] in geom_filter:
            geometry_type = GEOM_TYPE_OGR_2_GEOM_TYPE[ltype]
        elif len(geom_filter) > 1:
            # Can't determine single geometry type, need exploration
            add_explorer(GeomTypeExplorer, geom_filter, params)

        # FID field

        fid_field_index = None
        fid_field_found = False
        if params.fid_source in (FID_SOURCE.AUTO, FID_SOURCE.FIELD):
            for fid_field in params.fid_field:
                idx = defn.GetFieldIndex(fid_field)
                if idx != -1:
                    fid_field_found = True
                    fld_defn = defn.GetFieldDefn(idx)
                    fld_type = fld_defn.GetType()
                    if fld_type in (ogr.OFTInteger, ogr.OFTInteger64):
                        fid_field_index = idx
                        # Found FID field, should check for uniqueness
                        add_explorer(UniquenessExplorer, fid_field_index, fld_type)

                        if fld_type == ogr.OFTInteger64:
                            # FID is int64, should check values for int32 range
                            add_explorer(Int32RangeExplorer, fid_field_index)
                        break

        # Explore layer

        if len(explorers) > 0:
            _to_explore = set(explorers.values())
            for feature in ogrlayer:
                _done_explore = set()
                for explorer in _to_explore:
                    if explorer.explore(feature):
                        _done_explore.add(explorer)
                if len(_to_explore) == len(_done_explore):
                    break
                _to_explore -= _done_explore

            ogrlayer.ResetReading()

        # Geom type

        if gt_explorer := explorers.get(GeomTypeExplorer.identity):
            geom_filter = gt_explorer.geom_filter

            if params.cast_is_multi == TOGGLE.AUTO and not gt_explorer.is_multi:
                geom_filter = geom_filter - set(GEOM_TYPE.is_multi)

            if params.cast_has_z == TOGGLE.AUTO and not gt_explorer.has_z:
                geom_filter = geom_filter - set(GEOM_TYPE.has_z)

            if len(geom_filter) == 1:
                geometry_type = geom_filter.pop()

        if geometry_type is None:
            err_msg = gettext("Could not determine a geometry type.")
            if len(geom_filter) == 0:
                err_msg += " " + gettext(
                    "The source layer contains no suitable features, or "
                    "contains features of different geometry types."
                )
            raise VE(message=err_msg)

        # FID field

        fid_field = None
        if fid_field_index is not None:
            fid_field_ok = True
            fid_defn = defn.GetFieldDefn(fid_field_index)
            fid_field_name = fid_defn.GetName()

            if range_explorer := explorers.get(Int32RangeExplorer.identity):
                if not range_explorer.result_ok:
                    fid_field_ok = False
                    if params.fix_errors == FIX_ERRORS.NONE:
                        raise VE(
                            message=gettext("Field '%s' is out of int32 range.") % fid_field_name
                        )

            if uniqueness_explorer := explorers.get(UniquenessExplorer.identity):
                if not uniqueness_explorer.result_ok:
                    fid_field_ok = False
                    if params.fix_errors == FIX_ERRORS.NONE:
                        raise VE(
                            message=gettext("Field '%s' contains non-unique or empty values.")
                            % fid_field_name
                        )

            if fid_field_ok:
                fid_field = LoaderField(
                    fid_field_index, fid_field_name, fid_defn.GetType(), "INTEGER"
                )
            else:
                fid_field_index = None

        if (
            fid_field is None
            and params.fid_source == FID_SOURCE.FIELD
            and params.fix_errors == FIX_ERRORS.NONE
        ):
            if len(params.fid_field) == 0:
                raise VE(message=gettext("Parameter 'fid_field' is missing."))
            else:
                if not fid_field_found:
                    raise VE(message=gettext("Fields %s not found.") % params.fid_field)
                else:
                    raise VE(message=gettext("None of fields %s are integer.") % params.fid_field)

        # Fields

        fields: dict[int, LoaderField] = dict()
        for i in range(defn.GetFieldCount()):
            if i == fid_field_index:
                continue

            fld_defn = defn.GetFieldDefn(i)
            fld_name = fld_defn.GetNameRef()
            fixed_fld_name = fix_encoding(fld_name)

            if fld_name != fixed_fld_name and params.fix_errors != FIX_ERRORS.LOSSY:
                raise VE(message=gettext("Field '%s(?)' encoding is broken.") % fixed_fld_name)

            if fixed_fld_name == "":
                fixed_fld_name = "fld_1"

            fld_name = unique_name(fixed_fld_name, tuple(f.name for f in fields.values()))

            fld_type_ogr = fld_defn.GetType()
            if fld_type_ogr in STRING_CAST_TYPES:
                fld_type = FIELD_TYPE.STRING
            else:
                try:
                    fld_type = FIELD_TYPE_2_ENUM[fld_type_ogr]
                except KeyError:
                    raise VE(
                        message=gettext("Unsupported field type: %r.") % fld_defn.GetTypeName()
                    )

            fields[i] = LoaderField(i, fld_name, fld_type_ogr, fld_type)

        self.geometry_type = geometry_type
        self.fid_field = fid_field
        self.fields = fields

    def write(
        self,
        *,
        srs: SRS,
        schema: str,
        table: str,
        sequence: str,
        columns: dict[int, str],
        connection: sa.engine.Connection,
    ):
        ogrlayer = self.ogrlayer
        params = self.params

        source_osr = ogrlayer.GetSpatialRef()
        if source_osr.IsLocal():
            raise VE(
                gettext(
                    "The source layer has a local coordinate system and can't be "
                    "reprojected to the target coordinate system."
                )
            )

        target_osr = srs.to_osr()
        transform = (
            osr.CoordinateTransformation(source_osr, target_osr)
            if not source_osr.IsSame(target_osr)
            else None
        )

        static_size = FIELD_TYPE_SIZE[FIELD_TYPE.INTEGER]
        dynamic_size = 0
        string_fields = []
        for f in self.fields.values():
            if f.datatype == FIELD_TYPE.STRING:
                string_fields.append(f.name)
            else:
                static_size += FIELD_TYPE_SIZE[f.datatype]

        tab_sn = f"{schema}.{table}"
        seq_sn = f"{schema}.{sequence}"
        nextval = sa.text(f"nextval('{seq_sn}')")

        fields = []
        vcolumns = [sa.column("id"), sa.column("geom")]
        qparams = dict(
            id=sa.bindparam("id") if self.fid_field else nextval,
            geom=sa.func.ST_GeomFromWKB(sa.bindparam("geom"), sa.text(str(srs.id))),
        )

        if (fobj := self.fid_field) is not None:
            fid_fget = partial(
                _fid_fget,
                fget=partial(FIELD_GETTER[fobj.origtype], fidx=fobj.idx),
                fidx=fobj.idx,
                fname=fobj.name,
            )
        else:
            fid_fget = None

        for fidx, fobj in self.fields.items():
            fget = partial(FIELD_GETTER[fobj.origtype], fidx=fidx)
            fields.append((fidx, fobj.name, fget, fobj.origtype))
            fcol = columns[fidx]
            vcolumns.append(sa.column(fcol))
            qparams[fcol] = sa.bindparam(str(fidx))

        vtable = sa.table(table, *vcolumns, schema=schema)
        query_insert = sa.insert(vtable).values(**qparams)

        feature_count = 0
        chunk = []

        def insert_feature(data=None, *, flush=False):
            nonlocal feature_count
            if data is not None:
                chunk.append(data)
            if len(chunk) >= 1000 or (flush and len(chunk) > 0):
                connection.execute(query_insert, chunk)
                feature_count += len(chunk)
                chunk.clear()

        errors = []
        wkb_type = GEOM_TYPE_2_WKB_TYPE[self.geometry_type]
        for ogr_fid, feature in enumerate(ogrlayer, start=1):
            ctx = dict(fix_errors=params.fix_errors, fid=ogr_fid)
            try:
                row = dict()
                if fid_fget:
                    row["id"] = fid_fget(feature, ogr_fid)

                geom = feature.GetGeometryRef()
                if geom is not None and params.validate:
                    geom = _validate_geom(geom, wkb_type, **ctx)

                if geom is None:
                    row["geom"] = None
                else:
                    if transform and geom.Transform(transform) != 0:
                        raise FeatureError(
                            gettext(
                                "Feature #%d has a geometry that can't be "
                                "reprojected to target coordinate system"
                            )
                            % ogr_fid
                        )

                    geom_bytes = bytearray(geom.ExportToWkb(ogr.wkbNDR))
                    dynamic_size += len(geom_bytes)
                    row["geom"] = geom_bytes

                for fidx, fname, fget, ftype in fields:
                    if not feature.IsFieldSetAndNotNull(fidx):
                        fld_value = None
                    else:
                        fld_value = fget(feature)
                        if ftype in STRING_CAST_TYPES:
                            fld_value = dumps(fld_value)
                        elif params.validate and ftype == ogr.OFTString:
                            fld_value = _validate_string(fld_value, fname, **ctx)

                    row[str(fidx)] = fld_value
                    if fname in string_fields and fld_value is not None:
                        dynamic_size += utf8len(fld_value)

                insert_feature(row)

            except FeatureError as exc:
                if params.skip_errors:
                    continue  # Processs next feature
                elif params.skip_other_geometry_types and isinstance(
                    exc, FeatureGeometryTypeInvalid
                ):
                    continue  # Processs next feature
                elif len(errors) < ERROR_LIMIT:
                    errors.append(exc.args[0])
                else:
                    break

        if len(errors) > 0:
            detail = ""
            for i, err in enumerate(errors):
                if detail != "":
                    detail += "\n"
                detail += "* " + err
            raise VE(
                message=gettext("Vector layer cannot be written due to errors."), detail=detail
            )

        insert_feature(flush=True)
        size = static_size * feature_count + dynamic_size

        # Set sequence next value
        if fid_fget:
            max_fid = connection.scalar(sa.text(f"SELECT COALESCE(MAX(id), 0) FROM {tab_sn}"))
            sql_alter_seq = f"ALTER SEQUENCE {seq_sn} RESTART WITH {max_fid + 1}"
            connection.execute(sa.text(sql_alter_seq))

        return size


class FeatureError(Exception):
    pass


class FeatureGeometryTypeInvalid(FeatureError):
    pass


def _fid_fget(feature, ogr_fid, *, fget, fidx, fname):
    if not feature.IsFieldSet(fidx):
        raise FeatureError(
            gettext("Feature (seq. #%d) doesn't have a FID field '%s'.") % (ogr_fid, fname)
        )
    if feature.IsFieldNull(fidx):
        raise FeatureError(
            gettext("Feature (seq. #%d) FID field '%s' is null.") % (ogr_fid, fname)
        )
    return fget(feature)


def _wkb_product(*args):
    args = [((arg,) if isinstance(arg, str) else arg) for arg in args]
    return tuple(getattr(ogr, "wkb" + "".join(ai)) for ai in product(*args))


_wkb_points = _wkb_product(("", "Multi"), "Point", ("", "25D"))
_wkb_linestrings = _wkb_product(("", "Multi"), "LineString", ("", "25D"))
_wkb_polygons = _wkb_product(("", "Multi"), "Polygon", ("", "25D"))
_wkb_collections = _wkb_product("GeometryCollection", ("", "25D"))
_wkb_single = _wkb_product(("Point", "LineString", "Polygon"), ("", "25D"))
_wkb_multi = _wkb_product("Multi", ("Point", "LineString", "Polygon"), ("", "25D"))
_wkb_has_z = _wkb_product(("", "Multi"), ("Point", "LineString", "Polygon"), "25D")
_wkb_supported = _wkb_points + _wkb_linestrings + _wkb_polygons


def _validate_geom(geom, target, *, fix_errors, fid):
    if geom.IsMeasured() and fix_errors == FIX_ERRORS.LOSSY:
        geom.SetMeasured(False)

    wkb_type = geom.GetGeometryType()
    if (wkb_type in _wkb_has_z) != (target in _wkb_has_z):
        geom.Set3D(target in _wkb_has_z)

    # Extract GeometryCollection
    if wkb_type in _wkb_collections and fix_errors != FIX_ERRORS.NONE:
        geom_candidate = None
        for j in range(geom.GetGeometryCount()):
            member_geom = geom.GetGeometryRef(j)
            member_type = member_geom.GetGeometryType()
            if member_type not in _wkb_supported:
                continue
            if (
                (target in _wkb_points and member_type in _wkb_points)
                or (target in _wkb_linestrings and member_type in _wkb_linestrings)
                or (target in _wkb_polygons and member_type in _wkb_polygons)
            ):
                if geom_candidate is None:
                    geom_candidate = member_geom
                    if fix_errors == FIX_ERRORS.LOSSY:
                        break
                else:
                    raise FeatureError(
                        gettext("Feature #%d has multiple geometries satisfying the conditions.")
                        % fid
                    )
        if geom_candidate is not None:
            geom = geom_candidate
            wkb_type = geom.GetGeometryType()

    # Check geometry type
    if wkb_type not in _wkb_supported:
        raise FeatureGeometryTypeInvalid(
            gettext("Feature #%d has unknown geometry type: %d (%s).")
            % (fid, wkb_type, ogr.GeometryTypeToName(wkb_type))
        )
    elif not (
        (target in _wkb_points and wkb_type in _wkb_points)
        or (target in _wkb_linestrings and wkb_type in _wkb_linestrings)
        or (target in _wkb_polygons and wkb_type in _wkb_polygons)
    ):
        raise FeatureGeometryTypeInvalid(
            gettext("Feature #%d has unsuitable geometry type: %d (%s).")
            % (fid, wkb_type, ogr.GeometryTypeToName(wkb_type))
        )

    if (target in _wkb_multi) == (wkb_type in _wkb_multi):
        pass
    elif wkb_type in _wkb_single:
        # Promote single geometries to multi
        if wkb_type in (ogr.wkbPoint, ogr.wkbPoint25D):
            geom = ogr.ForceToMultiPoint(geom)
        elif wkb_type in (ogr.wkbLineString, ogr.wkbLineString25D):
            geom = ogr.ForceToMultiLineString(geom)
        elif wkb_type in (ogr.wkbPolygon, ogr.wkbPolygon25D):
            geom = ogr.ForceToMultiPolygon(geom)
    elif wkb_type in _wkb_multi:
        # Extract member from multi geometry
        if geom.GetGeometryCount() == 1 or fix_errors == FIX_ERRORS.LOSSY:
            geom = geom.GetGeometryRef(0)
        else:
            raise FeatureError(
                gettext("Feature #%d has multiple geometries satisfying the conditions.") % fid
            )

    if target in _wkb_points:
        pass  # Points are always valid.
    else:
        # Check for polygon rings with fewer than 3 points and linestrings with
        # fewer than 2 points. Check for polygon empty rings, which are not
        # valid for PostGIS.
        for part_idx, part in (
            ((None, geom),) if (target in _wkb_single) else _iter_reversed_geom(geom)
        ):
            if target in _wkb_polygons:
                for ring_idx, ring in _iter_reversed_geom(part):
                    if (ring_points := ring.GetPointCount()) == 0:
                        if fix_errors == FIX_ERRORS.NONE or (
                            ring_idx == 0 and target in _wkb_single
                        ):
                            raise FeatureError(gettext("Feature #%d has empty rings.") % fid)
                        elif ring_idx == 0:
                            geom.RemoveGeometry(part_idx)
                        else:
                            part.RemoveGeometry(ring_idx)
                    else:
                        ring_head = ring.GetPoint(0)
                        ring_tail = ring.GetPoint(ring_points - 1)
                        if any((h != t) for h, t in zip(ring_head, ring_tail)):
                            if fix_errors == FIX_ERRORS.NONE:
                                raise FeatureError(
                                    gettext("Feature #%d has unclosed rings.") % fid
                                )
                            if ring_points > 2:
                                # Closing a ring with 1 or 2 points makes no sense.
                                ring.AddPoint(*ring_head)
                                ring_points += 1
                        if ring_points < 4:
                            if fix_errors != FIX_ERRORS.LOSSY:
                                raise FeatureError(
                                    gettext(
                                        "Feature #%d has less than 3 points in a polygon ring."
                                    )
                                    % fid
                                )
                            elif ring_idx == 0 and target in _wkb_multi:
                                geom.RemoveGeometry(part_idx)
                            else:
                                part.RemoveGeometry(ring_idx)
            elif (part_points := part.GetPointCount()) == 0:
                if target in _wkb_single:
                    pass  # LINESTRING EMPTY
                elif fix_errors == FIX_ERRORS.NONE:
                    raise FeatureError(gettext("Feature #%d contains an empty linestring.") % fid)
                else:
                    geom.RemoveGeometry(part_idx)
            elif part_points < 2:
                if fix_errors != FIX_ERRORS.LOSSY:
                    raise FeatureError(
                        gettext("Feature #%d has less than 2 points in a linestring.") % fid
                    )
                if target in _wkb_multi:
                    geom.RemoveGeometry(part_idx)
                else:
                    geom = None

    return geom


def _validate_string(value, fname, *, fix_errors, fid):
    fixed = fix_encoding(value)
    if value != fixed:
        if fix_errors == FIX_ERRORS.LOSSY:
            value = fixed
        else:
            raise FeatureError(
                gettext("Feature #%d contains a broken encoding of field '%s'.") % (fid, fname)
            )
    return value


def _iter_reversed_geom(geom):
    for i in range(geom.GetGeometryCount() - 1, -1, -1):
        yield i, geom.GetGeometryRef(i)
