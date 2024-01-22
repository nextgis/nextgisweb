import re
import uuid

import geoalchemy2 as ga
from msgspec import UNSET
from osgeo import gdal, ogr
from shapely.geometry import box
from sqlalchemy import event, func, inspect, text
from sqlalchemy.exc import NoResultFound
from sqlalchemy.sql import column, delete, insert, select, table, update
from zope.interface import implementer
from zope.sqlalchemy import mark_changed

from nextgisweb.env import COMP_ID, Base, DBSession, _, env
from nextgisweb.lib import db

from nextgisweb.core.exception import ValidationError as VE
from nextgisweb.feature_layer import (
    FIELD_TYPE,
    GEOM_TYPE,
    IFeatureLayer,
    IFieldEditableFeatureLayer,
    IGeometryEditableFeatureLayer,
    IWritableFeatureLayer,
    LayerField,
    LayerFieldsMixin,
    on_data_change,
)
from nextgisweb.feature_layer.exception import FeatureNotFound
from nextgisweb.layer import IBboxLayer, SpatialLayerMixin
from nextgisweb.resource import DataScope, DataStructureScope, Resource, ResourceGroup, Serializer
from nextgisweb.resource import SerializedProperty as SP
from nextgisweb.resource import SerializedRelationship as SR
from nextgisweb.spatial_ref_sys import SRS

from .feature_query import FeatureQueryBase, calculate_extent
from .kind_of_data import VectorLayerData
from .table_info import TableInfo
from .util import (
    DRIVERS,
    ERROR_FIX,
    FID_SOURCE,
    FIELD_TYPE_2_DB,
    FIELD_TYPE_SIZE,
    SCHEMA,
    TOGGLE,
    read_dataset_vector,
)

Base.depends_on("resource", "feature_layer")

GEOM_TYPE_DISPLAY = (
    _("Point"),
    _("Line"),
    _("Polygon"),
    _("Multipoint"),
    _("Multiline"),
    _("Multipolygon"),
    _("Point Z"),
    _("Line Z"),
    _("Polygon Z"),
    _("Multipoint Z"),
    _("Multiline Z"),
    _("Multipolygon Z"),
)


skip_errors_default = False

geom_cast_params_default = dict(
    geometry_type=TOGGLE.AUTO,
    is_multi=TOGGLE.AUTO,
    has_z=TOGGLE.AUTO,
)


fid_params_default = dict(fid_source=FID_SOURCE.SEQUENCE, fid_field=[])


class VectorLayerField(Base, LayerField):
    identity = "vector_layer"

    __tablename__ = LayerField.__tablename__ + "_" + identity
    __mapper_args__ = dict(polymorphic_identity=identity)

    id = db.Column(db.ForeignKey(LayerField.id), primary_key=True)
    fld_uuid = db.Column(db.Unicode(32), nullable=False)

    @property
    def _column_name(self):
        return f"fld_{self.fld_uuid}"


@implementer(
    IFeatureLayer,
    IFieldEditableFeatureLayer,
    IGeometryEditableFeatureLayer,
    IWritableFeatureLayer,
    IBboxLayer,
)
class VectorLayer(Base, Resource, SpatialLayerMixin, LayerFieldsMixin):
    identity = "vector_layer"
    cls_display_name = _("Vector layer")

    __scope__ = DataScope

    tbl_uuid = db.Column(db.Unicode(32), nullable=False)
    geometry_type = db.Column(db.Enum(*GEOM_TYPE.enum), nullable=False)

    __field_class__ = VectorLayerField

    def __init__(self, *args, **kwagrs):
        if "tbl_uuid" not in kwagrs:
            kwagrs["tbl_uuid"] = uuid.uuid4().hex
        super().__init__(*args, **kwagrs)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    @property
    def _tablename(self):
        return "layer_%s" % self.tbl_uuid

    def _drop_table(self, *, connection):
        connection.execute(text(f"DROP TABLE {SCHEMA}.{self._tablename}"))

    def from_ogr(self, filename, *, layername=None):
        ds = read_dataset_vector(filename)
        layer = ds.GetLayerByName(layername) if layername is not None else ds.GetLayer(0)
        with DBSession.no_autoflush:
            self.setup_from_ogr(layer)
            self.load_from_ogr(layer, validate=False)
        return self

    def setup_from_ogr(
        self,
        ogrlayer,
        skip_other_geometry_types=False,
        fid_params=fid_params_default,
        geom_cast_params=geom_cast_params_default,
        fix_errors=ERROR_FIX.default,
    ):
        tableinfo = TableInfo.from_ogrlayer(
            ogrlayer, self.srs, skip_other_geometry_types, fid_params, geom_cast_params, fix_errors
        )
        tableinfo.setup_layer(self)

        tableinfo.setup_metadata(self._tablename)
        tableinfo.metadata.create_all(bind=DBSession.connection())

        self.tableinfo = tableinfo

    def setup_from_fields(self, fields):
        tableinfo = TableInfo.from_fields(fields, self.srs, self.geometry_type)
        tableinfo.setup_layer(self)

        tableinfo.setup_metadata(self._tablename)
        tableinfo.metadata.create_all(bind=DBSession.connection())

        self.tableinfo = tableinfo

    def load_from_ogr(
        self,
        ogrlayer,
        skip_other_geometry_types=False,
        fix_errors=ERROR_FIX.default,
        skip_errors=skip_errors_default,
        validate=True,
    ):
        size = self.tableinfo.load_from_ogr(
            ogrlayer, skip_other_geometry_types, fix_errors, skip_errors, validate
        )

        env.core.reserve_storage(COMP_ID, VectorLayerData, value_data_volume=size, resource=self)

    def get_info(self):
        return super().get_info() + (
            (_("Geometry type"), dict(zip(GEOM_TYPE.enum, GEOM_TYPE_DISPLAY))[self.geometry_type]),
            (_("Feature count"), self.feature_query()().total_count),
        )

    # IFeatureLayer

    @property
    def feature_query(self):
        srs_supported_ = [row[0] for row in DBSession.query(SRS.id).all()]

        class BoundFeatureQuery(FeatureQueryBase):
            layer = self
            srs_supported = srs_supported_

        return BoundFeatureQuery

    def field_by_keyname(self, keyname):
        for f in self.fields:
            if f.keyname == keyname:
                return f

        raise KeyError("Field '%s' not found!" % keyname)

    # IFieldEditableFeatureLayer

    def field_create(self, datatype):
        uid = uuid.uuid4().hex
        column = db.Column("fld_" + uid, FIELD_TYPE_2_DB[datatype])

        connection = inspect(self).session.connection()
        dialect = connection.engine.dialect
        connection.execute(
            db.text(
                "ALTER TABLE {}.{} ADD COLUMN {} {}".format(
                    SCHEMA,
                    self._tablename,
                    column.name,
                    column.type.compile(dialect),
                )
            )
        )

        return VectorLayerField(datatype=datatype, fld_uuid=uid)

    def field_delete(self, field):
        column_name = "fld_" + field.fld_uuid
        DBSession.delete(field)

        connection = inspect(self).session.connection()
        connection.execute(
            db.text(
                "ALTER TABLE {}.{} DROP COLUMN {}".format(
                    SCHEMA,
                    self._tablename,
                    column_name,
                )
            )
        )

    # IGeometryEditableFeatureLayer

    def geometry_type_change(self, geometry_type):
        if self.geometry_type == geometry_type:
            return

        for cls in (GEOM_TYPE.points, GEOM_TYPE.linestrings, GEOM_TYPE.polygons):
            if self.geometry_type in cls:
                geom_cls = cls
                break

        if geometry_type not in geom_cls:
            raise VE(
                message="Can't convert {0} geometry type to {1}.".format(
                    self.geometry_type, geometry_type
                )
            )

        is_multi_1 = self.geometry_type in GEOM_TYPE.is_multi
        is_multi_2 = geometry_type in GEOM_TYPE.is_multi
        has_z_1 = self.geometry_type in GEOM_TYPE.has_z
        has_z_2 = geometry_type in GEOM_TYPE.has_z

        column_geom = db.Column("geom")
        column_type_new = ga.types.Geometry(geometry_type=geometry_type, srid=self.srs_id)

        expr = column_geom

        if is_multi_1 and not is_multi_2:  # Multi -> single
            expr = func.ST_GeometryN(expr, 1)
        elif not is_multi_1 and is_multi_2:  # Single -> multi
            expr = func.ST_Multi(expr)

        if has_z_1 and not has_z_2:  # Z -> not Z
            expr = func.ST_Force2D(expr)
        elif not has_z_1 and has_z_2:  # not Z -> Z
            expr = func.ST_Force3D(expr)

        text = db.text(
            "ALTER TABLE {}.{} ALTER COLUMN {} TYPE {} USING {}".format(
                SCHEMA,
                self._tablename,
                column_geom,
                column_type_new,
                expr.compile(compile_kwargs=dict(literal_binds=True)),
            )
        )
        connection = inspect(self).session.connection()
        connection.execute(text)

        self.geometry_type = geometry_type

    # IWritableFeatureLayer

    def feature_put(self, feature):
        columns = [column("id")]
        values = dict()

        if (geom := feature.geom) is not None:
            columns.append(column("geom"))
            values["geom"] = func.ST_GeomFromWKB(geom.wkb, text(str(self.srs_id)))

        for f in self.fields:
            if (v := feature.fields.get(f.keyname, UNSET)) is not UNSET:
                columns.append(column(f._column_name))
                values[f._column_name] = v

        tab = table(self._tablename, *columns, schema=SCHEMA)
        query = update(tab).where(tab.c.id == feature.id).values(**values)

        DBSession.execute(query)
        mark_changed(DBSession())

        # TODO: Old geom version
        on_data_change.fire(self, feature.geom)

    def feature_create(self, feature):
        columns = [column("id")]
        values = [text(f"nextval('{SCHEMA}.{self._tablename}_id_seq')")]

        if (geom := feature.geom) is not None:
            columns.append(column("geom"))
            values.append(func.ST_GeomFromWKB(geom.wkb, text(str(self.srs_id))))

        for f in self.fields:
            if (v := feature.fields.get(f.keyname, UNSET)) is not UNSET:
                columns.append(column(f._column_name))
                values.append(v)

        tab = table(self._tablename, *columns, schema=SCHEMA)
        query = insert(tab).values(values).returning(tab.c.id)

        feature_id = DBSession.scalar(query)
        mark_changed(DBSession())

        on_data_change.fire(self, feature.geom)

        return feature_id

    def feature_delete(self, feature_id):
        tab = table(self._tablename, column("id"), column("geom"), schema=SCHEMA)
        query = delete(tab).where(tab.c.id == feature_id).returning(tab.c.geom)

        try:
            geom = DBSession.execute(query).one()[0]
        except NoResultFound:
            raise FeatureNotFound(self.id, feature_id)
        mark_changed(DBSession())

        on_data_change.fire(self, geom)

    def feature_delete_all(self):
        tab = table(self._tablename, schema=SCHEMA)
        query = delete(tab)

        DBSession.execute(query)
        mark_changed(DBSession())

        geom = box(self.srs.minx, self.srs.miny, self.srs.maxx, self.srs.maxy)
        on_data_change.fire(self, geom)

    # IBboxLayer implementation:

    @property
    def extent(self):
        return calculate_extent(self)


def estimate_vector_layer_data(resource):
    def fnull(expr):
        return func.coalesce(expr, text("0"))

    fixed = FIELD_TYPE_SIZE[FIELD_TYPE.INTEGER]  # ID field size
    dynamic = fnull(func.length(func.ST_AsBinary(text("geom"))))

    for f in resource.fields:
        if f.datatype == FIELD_TYPE.STRING:
            dynamic += fnull(func.octet_length(text(f._column_name)))
        else:
            fixed += FIELD_TYPE_SIZE[f.datatype]

    tab = table(resource._tablename, schema=SCHEMA)
    total = func.sum(dynamic + fixed).label("total")
    query = select(total).select_from(tab)

    return DBSession.scalar(query)


# Create vector_layer schema on table creation
event.listen(
    VectorLayer.__table__,
    "after_create",
    db.DDL("CREATE SCHEMA %s" % SCHEMA),
    propagate=True,
)

# Drop vector_layer schema on table creation
event.listen(
    VectorLayer.__table__,
    "after_drop",
    db.DDL("DROP SCHEMA IF EXISTS %s CASCADE" % SCHEMA),
    propagate=True,
)


# Drop data table on vector layer deletion
@event.listens_for(VectorLayer, "before_delete")
def drop_verctor_layer_table(mapper, connection, target):
    target._drop_table(connection=connection)


class _source_attr(SP):
    def _ogrds(self, filename, source_filename=None):
        ogrds = read_dataset_vector(
            filename,
            source_filename=source_filename,
        )

        if ogrds is None:
            ogrds = ogr.Open(filename, 0)
            if ogrds is None:
                raise VE(message=_("GDAL library failed to open file."))
            else:
                drivername = ogrds.GetDriver().GetName()
                raise VE(message=_("Unsupport OGR driver: %s.") % drivername)

        return ogrds

    def _ogrlayer(self, ogrds, layer_name=None):
        if layer_name is not None:
            ogrlayer = ogrds.GetLayerByName(layer_name)
        else:
            if ogrds.GetLayerCount() < 1:
                raise VE(message=_("Dataset doesn't contain layers."))

            if ogrds.GetLayerCount() > 1:
                raise VE(message=_("Dataset contains more than one layer."))

            ogrlayer = ogrds.GetLayer(0)

        if ogrlayer is None:
            raise VE(message=_("Unable to open layer."))

        # Do not trust geometry type of shapefiles
        if ogrds.GetDriver().ShortName == DRIVERS.ESRI_SHAPEFILE:
            ogrlayer.GetGeomType = lambda: ogr.wkbUnknown

        return ogrlayer

    def _setup_layer(
        self,
        obj,
        ogrlayer,
        skip_other_geometry_types,
        fix_errors,
        skip_errors,
        geom_cast_params,
        fid_params,
    ):
        try:
            # Apparently OGR_XLSX_HEADERS is taken into account during the GetSpatialRef call
            gdal.SetConfigOption("OGR_XLSX_HEADERS", "FORCE")
            if ogrlayer.GetSpatialRef() is None:
                raise VE(message=_("Layer doesn't contain coordinate system information."))
        finally:
            gdal.SetConfigOption("OGR_XLSX_HEADERS", None)

        with DBSession.no_autoflush:
            obj.setup_from_ogr(
                ogrlayer, skip_other_geometry_types, fid_params, geom_cast_params, fix_errors
            )
            obj.load_from_ogr(ogrlayer, skip_other_geometry_types, fix_errors, skip_errors)

    def setter(self, srlzr, value):
        if srlzr.obj.id is not None:
            srlzr.obj._drop_table(connection=DBSession.connection())
            srlzr.obj.tbl_uuid = uuid.uuid4().hex

        datafile, metafile = env.file_upload.get_filename(value["id"])

        ogrds = self._ogrds(datafile, source_filename=value.get("name"))

        layer_name = srlzr.data.get("source_layer")
        ogrlayer = self._ogrlayer(ogrds, layer_name=layer_name)

        skip_other_geometry_types = srlzr.data.get("skip_other_geometry_types")

        fix_errors = srlzr.data.get("fix_errors", ERROR_FIX.default)
        if fix_errors not in ERROR_FIX.enum:
            raise VE(message=_("Unknown 'fix_errors' value."))

        skip_errors = srlzr.data.get("skip_errors", skip_errors_default)

        geometry_type = srlzr.data.get(
            "cast_geometry_type", geom_cast_params_default["geometry_type"]
        )
        if geometry_type not in (None, "POINT", "LINESTRING", "POLYGON"):
            raise VE(message=_("Unknown 'cast_geometry_type' value."))

        is_multi = srlzr.data.get("cast_is_multi", geom_cast_params_default["is_multi"])
        if is_multi not in TOGGLE.enum:
            raise VE(message=_("Unknown 'cast_is_multi' value."))

        has_z = srlzr.data.get("cast_has_z", geom_cast_params_default["has_z"])
        if has_z not in TOGGLE.enum:
            raise VE(message=_("Unknown 'cast_has_z' value."))

        geom_cast_params = dict(geometry_type=geometry_type, is_multi=is_multi, has_z=has_z)

        fid_source = srlzr.data.get("fid_source", fid_params_default["fid_source"])
        fid_field_param = srlzr.data.get("fid_field")
        fid_field = (
            fid_params_default["fid_field"]
            if fid_field_param is None
            else re.split(r"\s*,\s*", fid_field_param)
        )

        fid_params = dict(fid_source=fid_source, fid_field=fid_field)

        self._setup_layer(
            srlzr.obj,
            ogrlayer,
            skip_other_geometry_types,
            fix_errors,
            skip_errors,
            geom_cast_params,
            fid_params,
        )


class _fields_attr(SP):
    def setter(self, srlzr, value):
        with DBSession.no_autoflush:
            srlzr.obj.setup_from_fields(value)


class _geometry_type_attr(SP):
    def setter(self, srlzr, value):
        if value not in GEOM_TYPE.enum:
            raise VE(message=_("Unsupported geometry type."))

        if srlzr.obj.id is None:
            srlzr.obj.geometry_type = value
        elif srlzr.obj.geometry_type == value:
            pass
        else:
            srlzr.obj.geometry_type_change(value)


class _delete_all_features_attr(SP):
    def setter(self, srlzr, value):
        if value:
            srlzr.obj.feature_delete_all()


P_DSS_READ = DataStructureScope.read
P_DSS_WRITE = DataStructureScope.write
P_DS_READ = DataScope.read
P_DS_WRITE = DataScope.write


class VectorLayerSerializer(Serializer):
    identity = VectorLayer.identity
    resclass = VectorLayer

    srs = SR(read=P_DSS_READ, write=P_DSS_WRITE)

    source = _source_attr(write=P_DS_WRITE)

    geometry_type = _geometry_type_attr(read=P_DSS_READ, write=P_DSS_WRITE)
    fields = _fields_attr(write=P_DS_WRITE)

    delete_all_features = _delete_all_features_attr(write=P_DS_WRITE)
