from typing import TYPE_CHECKING, Annotated, Literal

from osgeo import ogr
from zope.interface import Attribute, Interface

from nextgisweb.jsrealm import TSExport
from nextgisweb.resource import IResourceBase

GEOM_TYPE_OGR = (
    ogr.wkbPoint,
    ogr.wkbLineString,
    ogr.wkbPolygon,
    ogr.wkbMultiPoint,
    ogr.wkbMultiLineString,
    ogr.wkbMultiPolygon,
    ogr.wkbPoint25D,
    ogr.wkbLineString25D,
    ogr.wkbPolygon25D,
    ogr.wkbMultiPoint25D,
    ogr.wkbMultiLineString25D,
    ogr.wkbMultiPolygon25D,
)

FIELD_TYPE_OGR = (
    ogr.OFTInteger,
    ogr.OFTInteger64,
    ogr.OFTReal,
    ogr.OFTString,
    ogr.OFTDate,
    ogr.OFTTime,
    ogr.OFTDateTime,
)


class GEOM_TYPE:
    POINT = "POINT"
    LINESTRING = "LINESTRING"
    POLYGON = "POLYGON"
    MULTIPOINT = "MULTIPOINT"
    MULTILINESTRING = "MULTILINESTRING"
    MULTIPOLYGON = "MULTIPOLYGON"
    POINTZ = "POINTZ"
    LINESTRINGZ = "LINESTRINGZ"
    POLYGONZ = "POLYGONZ"
    MULTIPOINTZ = "MULTIPOINTZ"
    MULTILINESTRINGZ = "MULTILINESTRINGZ"
    MULTIPOLYGONZ = "MULTIPOLYGONZ"

    enum = (
        POINT,
        LINESTRING,
        POLYGON,
        MULTIPOINT,
        MULTILINESTRING,
        MULTIPOLYGON,
        POINTZ,
        LINESTRINGZ,
        POLYGONZ,
        MULTIPOINTZ,
        MULTILINESTRINGZ,
        MULTIPOLYGONZ,
    )

    points = (POINT, MULTIPOINT, POINTZ, MULTIPOINTZ)

    linestrings = (LINESTRING, MULTILINESTRING, LINESTRINGZ, MULTILINESTRINGZ)

    polygons = (POLYGON, MULTIPOLYGON, POLYGONZ, MULTIPOLYGONZ)

    is_multi = (
        MULTIPOINT,
        MULTILINESTRING,
        MULTIPOLYGON,
        MULTIPOINTZ,
        MULTILINESTRINGZ,
        MULTIPOLYGONZ,
    )

    has_z = (
        POINTZ,
        LINESTRINGZ,
        POLYGONZ,
        MULTIPOINTZ,
        MULTILINESTRINGZ,
        MULTIPOLYGONZ,
    )


GEOM_TYPE_OGR_2_GEOM_TYPE = dict(zip(GEOM_TYPE_OGR, GEOM_TYPE.enum))
GEOM_TYPE_2_WKB_TYPE = dict(zip(GEOM_TYPE.enum, GEOM_TYPE_OGR))


class FIELD_TYPE:
    INTEGER = "INTEGER"
    BIGINT = "BIGINT"
    REAL = "REAL"
    STRING = "STRING"
    DATE = "DATE"
    TIME = "TIME"
    DATETIME = "DATETIME"

    enum = (INTEGER, BIGINT, REAL, STRING, DATE, TIME, DATETIME)


if TYPE_CHECKING:
    FeaureLayerGeometryType = str
    FeatureLayerFieldDatatype = str
else:
    FeaureLayerGeometryType = Annotated[
        Literal[GEOM_TYPE.enum],
        TSExport("FeaureLayerGeometryType"),
    ]

    FeatureLayerFieldDatatype = Annotated[
        Literal[FIELD_TYPE.enum],
        TSExport("FeatureLayerFieldDatatype"),
    ]


class IFilterableFeatureLayer(IResourceBase):
    filter_parser = Attribute("""Filter parser for feature layer""")


class IFeatureLayer(IResourceBase):
    geometry_type = Attribute(""" Layer geometry type GEOM_TYPE """)
    fields = Attribute(""" List of fields """)

    feature_query = Attribute(""" Feature query class """)

    def field_by_keyname(self, keyname):
        """Get field by key. If field is not found,
        KeyError exception should be raised."""


class IFieldEditableFeatureLayer(IFeatureLayer):
    """Feature layer that supports field editing"""

    def field_create(self, datatype):
        """Create and return a new field without appending to a layer"""

    def field_delete(self, field):
        """Remove field"""


class IGeometryEditableFeatureLayer(IFeatureLayer):
    """Feature layer that supports geometry type editing"""

    def geometry_type_change(self, geom_type):
        """Change geometry type"""


class IWritableFeatureLayer(IFeatureLayer):
    """Feature layer that supports writing"""

    def feature_create(self, feature):
        """Create new feature with description from feature

        :param feature: feature description
        :type feature:  dict

        :return:        ID of new feature
        """

    def feature_delete(self, feature_id):
        """Remove feature with id

        :param feature_id: feature id
        :type feature_id:  int or bigint
        """

    def feature_delete_all(self):
        """Remove all features"""

    def feature_put(self, feature):
        """Save feature in a layer"""


class IVersionableFeatureLayer(IWritableFeatureLayer):
    pass


class IFeatureQuery(Interface):
    layer = Attribute(""" IFeatureLayer """)

    def fields(self, *args):
        """Set a list of request fields. If list of fields not set
        return all fields."""

    def limit(self, limit, offset=0):
        """Set request limit similarly to SQL
        LIMIT limit OFFSET offset"""

    def geom(self):
        """Include geometry in request result"""

    def geom_format(self):
        """Initially loaded geometry format"""

    def srs(self, srs):
        """Include CRS if
        it was included in request"""

    def box(self):
        """Include extent in request result"""


class IFeatureQueryFilter(IFeatureQuery):
    def filter(self, *args):
        """Set query rules"""


class IFeatureQueryFilterBy(IFeatureQuery):
    def filter_by(self, **kwargs):
        """Set query by attributes"""


class IFeatureQueryOrderBy(IFeatureQuery):
    def order_by(self, *args):
        """Set sort order"""


class IFeatureQueryLike(IFeatureQuery):
    def like(self, value):
        """Set query by substring"""


class IFeatureQueryIlike(IFeatureQuery):
    def ilike(self, value):
        """Set query by substring"""


class IFeatureQueryIntersects(IFeatureQuery):
    srs_supported = Attribute(""" List of supported SRS id """)

    def intersects(self, geom):
        """Set query by spatial intersection"""


class IFeatureQueryClipByBox(IFeatureQuery):
    def clip_by_box(self, box):
        """Clip geometry by bbox"""


class IFeatureQuerySimplify(IFeatureQuery):
    def simplify(self, tolerance):
        """Simplify geometry by the given tolerance"""
