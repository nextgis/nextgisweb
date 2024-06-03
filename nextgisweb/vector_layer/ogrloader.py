import dataclasses as dc
import re
from functools import partial
from itertools import product
from typing import Dict, List, Optional

import sqlalchemy as sa
from osgeo import ogr, osr

from nextgisweb.env import _
from nextgisweb.lib.json import dumps
from nextgisweb.lib.ogrhelper import FIELD_GETTER
from nextgisweb.lib.registry import DictRegistry

from nextgisweb.core.exception import ValidationError as VE
from nextgisweb.feature_layer import (
    FIELD_FORBIDDEN_NAME,
    FIELD_TYPE,
    GEOM_TYPE,
    GEOM_TYPE_2_WKB_TYPE,
    GEOM_TYPE_OGR,
    GEOM_TYPE_OGR_2_GEOM_TYPE,
)
from nextgisweb.spatial_ref_sys import SRS

from .util import FIELD_TYPE_2_ENUM, FIELD_TYPE_SIZE, fix_encoding, utf8len

MIN_INT32 = -(2**31)
MAX_INT32 = 2**31 - 1
ERROR_LIMIT = 10


class FID_SOURCE:
    AUTO = "AUTO"
    SEQUENCE = "SEQUENCE"
    FIELD = "FIELD"

    enum = (AUTO, SEQUENCE, FIELD)


class FIX_ERRORS:
    NONE = "NONE"
    SAFE = "SAFE"
    LOSSY = "LOSSY"

    enum = (NONE, SAFE, LOSSY)


class TOGGLE:
    AUTO = None
    YES = True
    NO = False

    enum = (AUTO, YES, NO)


@dc.dataclass
class LoaderParams:
    skip_other_geometry_types: bool = False
    fix_errors: str = FIX_ERRORS.NONE
    skip_errors: bool = False
    fid_source: str = FID_SOURCE.SEQUENCE
    fid_field: List[str] = dc.field(default_factory=list)
    cast_geometry_type: Optional[str] = TOGGLE.AUTO
    cast_is_multi: Optional[str] = TOGGLE.AUTO
    cast_has_z: Optional[str] = TOGGLE.AUTO
    validate: bool = True


@dc.dataclass
class LoaderField:
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


class OGRLoader:
    geometry_type: str
    fid_field: Optional[LoaderField]
    fields: Dict[int, LoaderField]

    def __init__(self, ogrlayer, params: LoaderParams):
        self.ogrlayer = ogrlayer
        self.params = params
        self.meta = None

    def scan(self):
        ogrlayer = self.ogrlayer
        params = self.params

        defn = ogrlayer.GetLayerDefn()

        explorer_registry = DictRegistry()

        class Explorer:
            identity = None

            def __init__(self):
                self.done = False
                explorer_registry.register(self)

            def _explore(self, feature):
                pass

            def work(self, feature):
                if self.done:
                    return
                self.done = self._explore(feature)

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

        class GeomTypeExplorer(Explorer):
            identity = "geom_type"

            def __init__(self, geom_filter):
                super().__init__()
                self.geom_filter = geom_filter
                self.is_multi = False
                self.has_z = False

            def _explore(self, feature):
                if len(self.geom_filter) <= 1:
                    return True

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

                if params.cast_geometry_type == TOGGLE.AUTO:
                    for _geom_types in (
                        GEOM_TYPE.points,
                        GEOM_TYPE.linestrings,
                        GEOM_TYPE.polygons,
                    ):
                        if geometry_type in _geom_types:
                            self.geom_filter = self.geom_filter.intersection(set(_geom_types))
                            break
                elif params.skip_other_geometry_types and geometry_type not in self.geom_filter:
                    return False

                if (
                    params.cast_is_multi == TOGGLE.AUTO
                    and not self.is_multi
                    and geometry_type in GEOM_TYPE.is_multi
                ):
                    self.geom_filter = self.geom_filter.intersection(set(GEOM_TYPE.is_multi))
                    self.is_multi = True

                if (
                    params.cast_has_z == TOGGLE.AUTO
                    and not self.has_z
                    and geometry_type in GEOM_TYPE.has_z
                ):
                    self.geom_filter = self.geom_filter.intersection(set(GEOM_TYPE.has_z))
                    self.has_z = True

                return False

        geometry_type = None
        if len(geom_filter) == 1:
            geometry_type = geom_filter.pop()
        elif ltype in GEOM_TYPE_OGR and GEOM_TYPE_OGR_2_GEOM_TYPE[ltype] in geom_filter:
            geometry_type = GEOM_TYPE_OGR_2_GEOM_TYPE[ltype]
        elif len(geom_filter) > 1:
            # Can't determine single geometry type, need exploration
            GeomTypeExplorer(geom_filter)

        # FID field

        class Int32RangeExplorer(Explorer):
            identity = "int32_range"

            def __init__(self, field_index):
                super().__init__()
                self.result_ok = True
                self.field_index = field_index

            def _explore(self, feature):
                i = self.field_index
                if not feature.IsFieldSet(i) or feature.IsFieldNull(i):
                    return False

                fid = feature.GetFieldAsInteger64(i)
                if not (MIN_INT32 < fid < MAX_INT32):
                    self.result_ok = False
                    return True

        class UniquenessExplorer(Explorer):
            identity = "unique"

            def __init__(self, field_index, field_type):
                super().__init__()
                self.result_ok = True
                self.field_index = field_index
                self.field_type = field_type
                self.values = set()

            def _explore(self, feature):
                i = self.field_index
                if not feature.IsFieldSet(i) or feature.IsFieldNull(i):
                    self.result_ok = False
                    return True

                if self.field_type == ogr.OFTInteger:
                    value = feature.GetFieldAsInteger(i)
                elif self.field_type == ogr.OFTInteger64:
                    value = feature.GetFieldAsInteger64(i)
                else:
                    raise NotImplementedError()

                if value in self.values:
                    self.result_ok = False
                    return True
                self.values.add(value)

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
                        UniquenessExplorer(fid_field_index, fld_type)

                        if fld_type == ogr.OFTInteger64:
                            # FID is int64, should check values for int32 range
                            Int32RangeExplorer(fid_field_index)
                        break

        # Explore layer

        if len(explorer_registry) > 0:
            for feature in ogrlayer:
                all_done = True
                for explorer in explorer_registry.values():
                    if not explorer.done:
                        explorer.work(feature)
                    all_done = all_done and explorer.done
                if all_done:
                    break

            ogrlayer.ResetReading()

        # Geom type

        if GeomTypeExplorer.identity in explorer_registry:
            gt_explorer = explorer_registry[GeomTypeExplorer.identity]

            geom_filter = gt_explorer.geom_filter

            if params.cast_is_multi == TOGGLE.AUTO and not gt_explorer.is_multi:
                geom_filter = geom_filter - set(GEOM_TYPE.is_multi)

            if params.cast_has_z == TOGGLE.AUTO and not gt_explorer.has_z:
                geom_filter = geom_filter - set(GEOM_TYPE.has_z)

            if len(geom_filter) == 1:
                geometry_type = geom_filter.pop()

        if geometry_type is None:
            err_msg = _("Could not determine a geometry type.")
            if len(geom_filter) == 0:
                err_msg += " " + _("Source layer contains no features satisfying the conditions.")
            raise VE(message=err_msg)

        # FID field

        fid_field = None
        if fid_field_index is not None:
            fid_field_ok = True
            fid_defn = defn.GetFieldDefn(fid_field_index)
            fid_field_name = fid_defn.GetName()

            if Int32RangeExplorer.identity in explorer_registry:
                range_explorer = explorer_registry[Int32RangeExplorer.identity]
                if not range_explorer.result_ok:
                    fid_field_ok = False
                    if params.fix_errors == FIX_ERRORS.NONE:
                        raise VE(message=_("Field '%s' is out of int32 range.") % fid_field_name)

            if UniquenessExplorer.identity in explorer_registry:
                uniqueness_explorer = explorer_registry[UniquenessExplorer.identity]
                if not uniqueness_explorer.result_ok:
                    fid_field_ok = False
                    if params.fix_errors == FIX_ERRORS.NONE:
                        raise VE(
                            message=_("Field '%s' contains non-unique or empty values.")
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
                raise VE(message=_("Parameter 'fid_field' is missing."))
            else:
                if not fid_field_found:
                    raise VE(message=_("Fields %s not found.") % params.fid_field)
                else:
                    raise VE(message=_("None of fields %s are integer.") % params.fid_field)

        # Fields

        field_suffix_pattern = re.compile(r"(.*)_(\d+)")
        fields: Dict[int, LoaderField] = dict()
        for i in range(defn.GetFieldCount()):
            if i == fid_field_index:
                continue

            fld_defn = defn.GetFieldDefn(i)
            fld_name = fld_defn.GetNameRef()
            fixed_fld_name = fix_encoding(fld_name)

            if fld_name != fixed_fld_name and params.fix_errors != FIX_ERRORS.LOSSY:
                raise VE(message=_("Field '%s(?)' encoding is broken.") % fixed_fld_name)

            if fixed_fld_name.lower() in FIELD_FORBIDDEN_NAME:
                if params.fix_errors == FIX_ERRORS.NONE:
                    raise VE(
                        message=_("Field name is forbidden: '%s'. Please remove or rename it.")
                        % fld_name
                    )
                else:
                    fixed_fld_name += "_1"

            if fld_name != fixed_fld_name:
                if fixed_fld_name == "":
                    fixed_fld_name = "fld_1"
                while True:
                    unique_check = True
                    for field in fields.values():
                        if field.name == fixed_fld_name:
                            unique_check = False

                            match = field_suffix_pattern.match(fixed_fld_name)
                            if match is None:
                                fixed_fld_name += "_1"
                            else:
                                n = int(match[2]) + 1
                                fixed_fld_name = "%s_%d" % (match[1], n)
                            break
                    if unique_check:
                        break
                fld_name = fixed_fld_name

            fld_type_ogr = fld_defn.GetType()
            if fld_type_ogr in STRING_CAST_TYPES:
                fld_type = FIELD_TYPE.STRING
            else:
                try:
                    fld_type = FIELD_TYPE_2_ENUM[fld_type_ogr]
                except KeyError:
                    raise VE(message=_("Unsupported field type: %r.") % fld_defn.GetTypeName())

            fields[i] = LoaderField(i, fld_name, fld_type_ogr, fld_type)

        self.geometry_type = geometry_type
        self.fid_field = fid_field
        self.fields = fields
        return self

    def write(
        self,
        *,
        srs: SRS,
        schema: str,
        table: str,
        sequence: str,
        columns: Dict[int, str],
        connection: sa.engine.Connection,
    ):
        ogrlayer = self.ogrlayer
        params = self.params

        source_osr = ogrlayer.GetSpatialRef()
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
                if params.validate:
                    geom = _validate_geom(geom, wkb_type, **ctx)

                if transform and geom.Transform(transform) != 0:
                    raise FeatureError(
                        _(
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
            raise VE(message=_("Vector layer cannot be written due to errors."), detail=detail)

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
            _("Feature (seq. #%d) doesn't have a FID field '%s'.") % (ogr_fid, fname)
        )
    if feature.IsFieldNull(fidx):
        raise FeatureError(_("Feature (seq. #%d) FID field '%s' is null.") % (ogr_fid, fname))
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
    if geom is None:
        raise FeatureGeometryTypeInvalid(_("Feature #%d doesn't have geometry.") % fid)

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
                        _("Feature #%d has multiple geometries satisfying the conditions.") % fid
                    )
        if geom_candidate is not None:
            geom = geom_candidate
            wkb_type = geom.GetGeometryType()

    # Check geometry type
    if wkb_type not in _wkb_supported:
        raise FeatureGeometryTypeInvalid(
            _("Feature #%d has unknown geometry type: %d (%s).")
            % (fid, wkb_type, ogr.GeometryTypeToName(wkb_type))
        )
    elif not (
        (target in _wkb_points and wkb_type in _wkb_points)
        or (target in _wkb_linestrings and wkb_type in _wkb_linestrings)
        or (target in _wkb_polygons and wkb_type in _wkb_polygons)
    ):
        raise FeatureGeometryTypeInvalid(
            _("Feature #%d has unsuitable geometry type: %d (%s).")
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
                _("Feature #%d has multiple geometries satisfying the conditions.") % fid
            )

    if wkb_type in _wkb_points:
        pass  # Points are always valid.
    elif not geom.IsValid():
        # Close rings for polygons: GDAL doesn't provide a method for checking
        # if a geometry has unclosed rings, but we can achieve this via
        # comparison.
        if wkb_type in _wkb_polygons:
            geom_closed = geom.Clone()
            geom_closed.CloseRings()
            if not geom_closed.Equals(geom):
                if fix_errors == FIX_ERRORS.NONE:
                    raise FeatureError(_("Feature #%d has unclosed rings.") % fid)
                else:
                    geom = geom_closed

        # Check for polygon rings with fewer than 3 points and linestrings with
        # fewer than 2 points.
        if not geom.IsValid():
            for part in (geom,) if (wkb_type in _wkb_single) else geom:
                if wkb_type in _wkb_polygons:
                    for ring in part:
                        if ring.GetPointCount() < 4:
                            # TODO: Invalid parts can be removed from multipart
                            # geometries in LOSSY mode.
                            raise FeatureError(
                                _("Feature #%d has less than 3 points in a polygon ring.") % fid
                            )
                elif part.GetPointCount() < 2:
                    # TODO: Invalid parts can be removed from multipart
                    # geometries in LOSSY mode.
                    raise FeatureError(
                        _("Feature #%d has less than 2 points in a linestring.") % fid
                    )

        # NOTE: Disabled for better times.
        # Check for topology errors and fix them as possible.
        # invalid = True
        # if fix_errors != ERROR_FIX.NONE:
        #     if fix_errors == ERROR_FIX.LOSSY and not geom.IsValid():
        #         geom = geom.MakeValid()
        #         if geom is not None and not geom.IsValid():
        #             geom = geom.Buffer(0)
        #     invalid = geom is None or not geom.IsValid() or geom.GetGeometryType() != gtype
        # if invalid:
        #     errors.append(_("Feature #%d has invalid geometry.") % fid)
        #     continue

    return geom


def _validate_string(value, fname, *, fix_errors, fid):
    fixed = fix_encoding(value)
    if value != fixed:
        if fix_errors == FIX_ERRORS.LOSSY:
            value = fixed
        else:
            raise FeatureError(
                _("Feature #%d contains a broken encoding of field '%s'.") % (fid, fname)
            )
    return value
