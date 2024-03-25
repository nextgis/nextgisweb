import re
import uuid
from functools import partial
from html import escape as html_escape

import geoalchemy2 as ga
from osgeo import ogr, osr
from sqlalchemy import insert, text
from sqlalchemy.orm import registry

from nextgisweb.env import DBSession, _, env
from nextgisweb.lib import db
from nextgisweb.lib.json import dumps
from nextgisweb.lib.ogrhelper import FIELD_GETTER
from nextgisweb.lib.registry import DictRegistry

from nextgisweb.core.exception import ValidationError as VE
from nextgisweb.feature_layer import (
    FIELD_FORBIDDEN_NAME,
    FIELD_TYPE,
    GEOM_TYPE,
    GEOM_TYPE_OGR,
    GEOM_TYPE_OGR_2_GEOM_TYPE,
)

from .util import (
    ERROR_FIX,
    FID_SOURCE,
    FIELD_TYPE_2_DB,
    FIELD_TYPE_2_ENUM,
    FIELD_TYPE_SIZE,
    GEOM_TYPE_2_DB,
    SCHEMA,
    TOGGLE,
    fix_encoding,
    utf8len,
)

ERROR_LIMIT = 10

MIN_INT32 = -(2**31)
MAX_INT32 = 2**31 - 1

STRING_CAST_TYPES = (
    ogr.OFTIntegerList,
    ogr.OFTInteger64List,
    ogr.OFTRealList,
    ogr.OFTStringList,
)


def translate(trstring):
    return env.core.localizer().translate(trstring)


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
        text_search=None,
        ogrindex=None,
    ):
        self.key = key
        self.keyname = keyname
        self.datatype = datatype
        self.uuid = uuid
        self.display_name = display_name
        self.label_field = label_field
        self.grid_visibility = grid_visibility
        self.text_search = text_search
        self.ogrindex = ogrindex


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
        self.geometry_type = None

    @classmethod
    def from_ogrlayer(
        cls, ogrlayer, srs, skip_other_geometry_types, fid_params, geom_cast_params, fix_errors
    ):
        self = cls(srs)

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

        if geom_cast_params["geometry_type"] == GEOM_TYPE.POINT:
            geom_filter = set(GEOM_TYPE.points)
        elif geom_cast_params["geometry_type"] == GEOM_TYPE.LINESTRING:
            geom_filter = set(GEOM_TYPE.linestrings)
        elif geom_cast_params["geometry_type"] == GEOM_TYPE.POLYGON:
            geom_filter = set(GEOM_TYPE.polygons)
        else:
            geom_filter = set(GEOM_TYPE.enum)

        if geom_cast_params["is_multi"] == TOGGLE.NO:
            geom_filter -= set(GEOM_TYPE.is_multi)
        elif geom_cast_params["is_multi"] == TOGGLE.YES:
            geom_filter = geom_filter.intersection(set(GEOM_TYPE.is_multi))

        if geom_cast_params["has_z"] == TOGGLE.NO:
            geom_filter -= set(GEOM_TYPE.has_z)
        elif geom_cast_params["has_z"] == TOGGLE.YES:
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

                if geom_cast_params["geometry_type"] == TOGGLE.AUTO:
                    for _geom_types in (
                        GEOM_TYPE.points,
                        GEOM_TYPE.linestrings,
                        GEOM_TYPE.polygons,
                    ):
                        if geometry_type in _geom_types:
                            self.geom_filter = self.geom_filter.intersection(set(_geom_types))
                            break
                elif skip_other_geometry_types and geometry_type not in self.geom_filter:
                    return False

                if (
                    geom_cast_params["is_multi"] == TOGGLE.AUTO
                    and not self.is_multi
                    and geometry_type in GEOM_TYPE.is_multi
                ):
                    self.geom_filter = self.geom_filter.intersection(set(GEOM_TYPE.is_multi))
                    self.is_multi = True

                if (
                    geom_cast_params["has_z"] == TOGGLE.AUTO
                    and not self.has_z
                    and geometry_type in GEOM_TYPE.has_z
                ):
                    self.geom_filter = self.geom_filter.intersection(set(GEOM_TYPE.has_z))
                    self.has_z = True

                return False

        if len(geom_filter) == 1:
            self.geometry_type = geom_filter.pop()
        elif ltype in GEOM_TYPE_OGR and GEOM_TYPE_OGR_2_GEOM_TYPE[ltype] in geom_filter:
            self.geometry_type = GEOM_TYPE_OGR_2_GEOM_TYPE[ltype]
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
        if fid_params["fid_source"] in (FID_SOURCE.AUTO, FID_SOURCE.FIELD):
            for fid_field in fid_params["fid_field"]:
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

            if geom_cast_params["is_multi"] == TOGGLE.AUTO and not gt_explorer.is_multi:
                geom_filter = geom_filter - set(GEOM_TYPE.is_multi)

            if geom_cast_params["has_z"] == TOGGLE.AUTO and not gt_explorer.has_z:
                geom_filter = geom_filter - set(GEOM_TYPE.has_z)

            if len(geom_filter) == 1:
                self.geometry_type = geom_filter.pop()

        if self.geometry_type is None:
            err_msg = _("Could not determine a geometry type.")
            if len(geom_filter) == 0:
                err_msg += " " + _("Source layer contains no features satisfying the conditions.")
            raise VE(message=err_msg)

        # FID field

        if fid_field_index is not None:
            fid_field_ok = True

            fid_field_name = defn.GetFieldDefn(fid_field_index).GetName()

            if Int32RangeExplorer.identity in explorer_registry:
                range_explorer = explorer_registry[Int32RangeExplorer.identity]
                if not range_explorer.result_ok:
                    fid_field_ok = False
                    if fix_errors == ERROR_FIX.NONE:
                        raise VE(message=_("Field '%s' is out of int32 range.") % fid_field_name)

            if UniquenessExplorer.identity in explorer_registry:
                uniqueness_explorer = explorer_registry[UniquenessExplorer.identity]
                if not uniqueness_explorer.result_ok:
                    fid_field_ok = False
                    if fix_errors == ERROR_FIX.NONE:
                        raise VE(
                            message=_("Field '%s' contains non-unique or empty values.")
                            % fid_field_name
                        )

            if fid_field_ok:
                self.fid_field_index = fid_field_index

        if (
            self.fid_field_index is None
            and fid_params["fid_source"] == FID_SOURCE.FIELD
            and fix_errors == ERROR_FIX.NONE
        ):
            if len(fid_params["fid_field"]) == 0:
                raise VE(message=_("Parameter 'fid_field' is missing."))
            else:
                if not fid_field_found:
                    raise VE(message=_("Fields %s not found.") % fid_params["fid_field"])
                else:
                    raise VE(message=_("None of fields %s are integer.") % fid_params["fid_field"])

        # Fields

        field_suffix_pattern = re.compile(r"(.*)_(\d+)")

        for i in range(defn.GetFieldCount()):
            if i == self.fid_field_index:
                continue
            fld_defn = defn.GetFieldDefn(i)

            fld_name = fld_defn.GetNameRef()
            fixed_fld_name = fix_encoding(fld_name)

            if fld_name != fixed_fld_name and fix_errors != ERROR_FIX.LOSSY:
                raise VE(message=_("Field '%s(?)' encoding is broken.") % fixed_fld_name)

            if fixed_fld_name.lower() in FIELD_FORBIDDEN_NAME:
                if fix_errors == ERROR_FIX.NONE:
                    raise VE(
                        message=_("Field name is forbidden: '%s'. Please remove or " "rename it.")
                        % fld_name
                    )
                else:
                    fixed_fld_name += "_1"

            if fld_name != fixed_fld_name:
                if fixed_fld_name == "":
                    fixed_fld_name = "fld_1"
                while True:
                    unique_check = True
                    for field in self.fields:
                        if field.keyname == fixed_fld_name:
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

            uid = uuid.uuid4().hex
            self.fields.append(FieldDef("fld_%s" % uid, fld_name, fld_type, uid, ogrindex=i))

        return self

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
                    fld.get("text_search"),
                )
            )

        return self

    @classmethod
    def from_layer(cls, layer):
        self = cls(layer.srs)

        self.geometry_type = layer.geometry_type

        for f in layer.fields:
            self.fields.append(
                FieldDef(
                    "fld_%s" % f.fld_uuid,
                    f.keyname,
                    f.datatype,
                    f.fld_uuid,
                    text_search=f.text_search,
                )
            )

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
            if f.text_search is not None:
                field.text_search = f.text_search

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
            *map(lambda fld: db.Column(fld.key, FIELD_TYPE_2_DB[fld.datatype]), self.fields)
        )

        mapper_registry = registry()
        mapper_registry.map_imperatively(model, table)

        self.metadata = metadata
        self.sequence = sequence
        self.table = table
        self.model = model
        self.id_column = table.c.id
        self.geom_column = table.c.geom

    def load_from_ogr(
        self,
        ogrlayer,
        skip_other_geometry_types,
        fix_errors,
        skip_errors,
        validate,
    ):
        source_osr = ogrlayer.GetSpatialRef()
        target_osr = self.srs.to_osr()

        transform = (
            osr.CoordinateTransformation(source_osr, target_osr)
            if not source_osr.IsSame(target_osr)
            else None
        )

        errors = []

        num_features = 0
        static_size = FIELD_TYPE_SIZE[FIELD_TYPE.INTEGER]
        dynamic_size = 0
        string_fields = []
        for f in self.fields:
            if f.datatype == FIELD_TYPE.STRING:
                string_fields.append(f.keyname)
            else:
                static_size += FIELD_TYPE_SIZE[f.datatype]

        defn = ogrlayer.GetLayerDefn()

        fieldmap = list()
        for fidx in range(defn.GetFieldCount()):
            fdefn = defn.GetFieldDefn(fidx)
            fname = fdefn.GetName()
            ftype = fdefn.GetType()
            fget = partial(FIELD_GETTER[ftype], fidx=fidx)
            field = self.find_field(ogrindex=fidx)
            fieldmap.append((fname, fget, ftype, field))

        if self.fid_field_index is not None:
            fid_field_name, fid_fget = fieldmap[self.fid_field_index][:2]

        max_fid = None
        chunk = []

        def add_record(record):
            if record is not None:
                chunk.append(record)
            if len(chunk) >= 1000 or (record is None and len(chunk) > 0):
                DBSession.execute(insert(self.table), chunk)
                chunk.clear()

        for i, feature in enumerate(ogrlayer, start=1):
            if len(errors) >= ERROR_LIMIT and not skip_errors:
                break

            if self.fid_field_index is None:
                fid = i
            else:
                if not feature.IsFieldSet(self.fid_field_index):
                    errors.append(
                        _("Feature (seq. #%d) doesn't have a FID field '%s'.")
                        % (i, fid_field_name)
                    )
                    continue
                if feature.IsFieldNull(self.fid_field_index):
                    errors.append(
                        _("Feature (seq. #%d) FID field '%s' is null.") % (i, fid_field_name)
                    )
                    continue
                fid = fid_fget(feature)

            max_fid = max(max_fid, fid) if max_fid is not None else fid

            geom = feature.GetGeometryRef()
            if validate:
                if geom is None:
                    if not skip_other_geometry_types:
                        errors.append(_("Feature #%d doesn't have geometry.") % fid)
                    continue

                if geom.IsMeasured() and fix_errors == ERROR_FIX.LOSSY:
                    geom.SetMeasured(False)

                # Extract GeometryCollection
                if (
                    geom.GetGeometryType()
                    in (ogr.wkbGeometryCollection, ogr.wkbGeometryCollection25D)
                    and fix_errors != ERROR_FIX.NONE
                ):
                    geom_candidate = None
                    for j in range(geom.GetGeometryCount()):
                        col_geom = geom.GetGeometryRef(j)
                        col_gtype = col_geom.GetGeometryType()
                        if col_gtype not in GEOM_TYPE_OGR:
                            continue
                        if (
                            (
                                self.geometry_type in GEOM_TYPE.points
                                and col_gtype
                                in (
                                    ogr.wkbPoint,
                                    ogr.wkbPoint25D,
                                    ogr.wkbMultiPoint,
                                    ogr.wkbMultiPoint25D,
                                )
                            )
                            or (
                                self.geometry_type in GEOM_TYPE.linestrings
                                and col_gtype
                                in (
                                    ogr.wkbLineString,
                                    ogr.wkbLineString25D,
                                    ogr.wkbMultiLineString,
                                    ogr.wkbMultiLineString25D,
                                )
                            )
                            or (
                                self.geometry_type in GEOM_TYPE.polygons
                                and col_gtype
                                in (
                                    ogr.wkbPolygon,
                                    ogr.wkbPolygon25D,
                                    ogr.wkbMultiPolygon,
                                    ogr.wkbMultiPolygon25D,
                                )
                            )
                        ):
                            if geom_candidate is None:
                                geom_candidate = col_geom
                                if fix_errors == ERROR_FIX.LOSSY:
                                    break
                            else:
                                errors.append(
                                    _(
                                        "Feature #%d has multiple geometries satisfying the conditions."
                                    )
                                    % fid
                                )
                                continue
                    if geom_candidate is not None:
                        geom = geom_candidate

                gtype = geom.GetGeometryType()

                # Check geometry type
                if gtype not in GEOM_TYPE_OGR:
                    if not skip_other_geometry_types:
                        errors.append(
                            _("Feature #%d has unknown geometry type: %d (%s).")
                            % (fid, gtype, ogr.GeometryTypeToName(gtype))
                        )
                    continue
                elif not any(
                    (
                        (
                            self.geometry_type in GEOM_TYPE.points
                            and GEOM_TYPE_OGR_2_GEOM_TYPE[gtype] in GEOM_TYPE.points
                        ),
                        (
                            self.geometry_type in GEOM_TYPE.linestrings
                            and GEOM_TYPE_OGR_2_GEOM_TYPE[gtype] in GEOM_TYPE.linestrings
                        ),
                        (
                            self.geometry_type in GEOM_TYPE.polygons
                            and GEOM_TYPE_OGR_2_GEOM_TYPE[gtype] in GEOM_TYPE.polygons
                        ),
                    )
                ):
                    if not skip_other_geometry_types:
                        errors.append(
                            _("Feature #%d has unsuitable geometry type: %d (%s).")
                            % (fid, gtype, ogr.GeometryTypeToName(gtype))
                        )
                    continue

                # Force single geometries to multi
                if self.geometry_type in GEOM_TYPE.is_multi:
                    if gtype in (ogr.wkbPoint, ogr.wkbPoint25D):
                        geom = ogr.ForceToMultiPoint(geom)
                    elif gtype in (ogr.wkbLineString, ogr.wkbLineString25D):
                        geom = ogr.ForceToMultiLineString(geom)
                    elif gtype in (ogr.wkbPolygon, ogr.wkbPolygon25D):
                        geom = ogr.ForceToMultiPolygon(geom)
                elif gtype in (
                    ogr.wkbMultiPoint,
                    ogr.wkbMultiPoint25D,
                    ogr.wkbMultiLineString,
                    ogr.wkbMultiLineString25D,
                    ogr.wkbMultiPolygon,
                    ogr.wkbMultiPolygon25D,
                ):
                    if geom.GetGeometryCount() == 1 or fix_errors == ERROR_FIX.LOSSY:
                        geom = geom.GetGeometryRef(0)
                    else:
                        errors.append(
                            _("Feature #%d has multiple geometries satisfying the conditions.")
                            % fid
                        )
                        continue

            if transform is not None:
                if geom.Transform(transform) != 0:
                    errors.append(
                        _(
                            "Feature #%d has a geometry that can't be reprojected to "
                            "target coordinate system"
                        )
                        % fid
                    )
                    continue

            if validate:
                # Force Z
                has_z = self.geometry_type in GEOM_TYPE.has_z
                if has_z and not geom.Is3D():
                    geom.Set3D(True)
                elif not has_z and geom.Is3D():
                    geom.Set3D(False)

                # Points can't have validity errors.
                is_single = GEOM_TYPE_OGR_2_GEOM_TYPE[gtype] not in GEOM_TYPE.is_multi
                is_point = GEOM_TYPE_OGR_2_GEOM_TYPE[gtype] in GEOM_TYPE.points
                is_polygon = GEOM_TYPE_OGR_2_GEOM_TYPE[gtype] in GEOM_TYPE.polygons

                if not is_point and not geom.IsValid():
                    # Close rings for polygons: GDAL doesn't provide a method for
                    # checking if a geometry has unclosed rings, but we can achieve
                    # this via comparison.
                    if is_polygon:
                        geom_closed = geom.Clone()
                        geom_closed.CloseRings()
                        if not geom_closed.Equals(geom):
                            if fix_errors == ERROR_FIX.NONE:
                                errors.append(_("Feature #%d has unclosed rings.") % fid)
                                continue
                            else:
                                geom = geom_closed

                    # Check for polygon rings with fewer than 3 points and
                    # linestrings with fewer than 2 points.
                    if not geom.IsValid():
                        error_found = False
                        for part in (geom,) if is_single else geom:
                            if is_polygon:
                                for ring in part:
                                    if ring.GetPointCount() < 4:
                                        # TODO: Invalid parts can be removed from multipart geometries in LOSSY mode.
                                        errors.append(
                                            _(
                                                "Feature #%d has less than 3 points in a polygon ring."
                                            )
                                            % fid
                                        )
                                        error_found = True
                            elif part.GetPointCount() < 2:
                                # TODO: Invalid parts can be removed from multipart geometries in LOSSY mode.
                                errors.append(
                                    _("Feature #%d has less than 2 points in a linestring.") % fid
                                )
                                error_found = True
                            if error_found:
                                break
                        if error_found:
                            continue

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

            fld_values = dict()
            for k, (fname, fget, ftype, field) in enumerate(fieldmap):
                if k == self.fid_field_index:
                    continue

                ftype = feature.GetFieldDefnRef(k).GetType()

                if not feature.IsFieldSetAndNotNull(k):
                    fld_value = None
                else:
                    fld_value = FIELD_GETTER[ftype](feature, k)

                    if ftype in STRING_CAST_TYPES:
                        fld_value = dumps(fld_value)
                    elif validate and ftype == ogr.OFTString:
                        fixed_fld_value = fix_encoding(fld_value)
                        if fld_value != fixed_fld_value:
                            if fix_errors == ERROR_FIX.LOSSY:
                                fld_value = fixed_fld_value
                            else:
                                errors.append(
                                    _("Feature #%d contains a broken encoding of field '%s'.")
                                    % (fid, field.keyname)
                                )
                                continue

                fld_values[field.key] = fld_value

                if field.keyname in string_fields and fld_value is not None:
                    dynamic_size += utf8len(fld_value)

            if len(errors) > 0 and not skip_errors:
                continue

            geom_bytes = bytearray(geom.ExportToWkb(ogr.wkbNDR))
            dynamic_size += len(geom_bytes)

            record = dict(
                id=fid, geom=ga.elements.WKBElement(geom_bytes, srid=self.srs.id), **fld_values
            )
            add_record(record)

            num_features += 1
        add_record(None)

        if len(errors) > 0 and not skip_errors:
            detail = "<br>".join(html_escape(translate(error), quote=False) for error in errors)
            raise VE(message=_("Vector layer cannot be written due to errors."), detail=detail)

        size = static_size * num_features + dynamic_size

        # Set sequence next value
        if max_fid is not None:
            connection = DBSession.connection()
            connection.execute(
                text(
                    'ALTER SEQUENCE "%s"."%s" RESTART WITH %d'
                    % (self.sequence.schema, self.sequence.name, max_fid + 1)
                )
            )

        return size
