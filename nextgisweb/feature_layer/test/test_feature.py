from datetime import date, datetime, time

import pytest
from osgeo import ogr

from nextgisweb.lib.ogrhelper import FIELD_GETTER

from .. import FIELD_TYPE, Feature
from ..model import _FIELD_TYPE_2_ENUM_REVERSED


def test_ogr_feature():
    # Field type is keyname also
    data = (
        (FIELD_TYPE.INTEGER, 2147483647),
        (FIELD_TYPE.BIGINT, -9223372036854775808),
        (FIELD_TYPE.REAL, 0.3333),
        (FIELD_TYPE.STRING, "~!@#$%^&*()-=`'\"\\/"),
        (FIELD_TYPE.DATETIME, datetime(2025, 9, 11, 12, 50, 59)),
        (FIELD_TYPE.DATE, date(2011, 6, 8)),
        (FIELD_TYPE.TIME, time(23, 59, 59)),
    )

    defn = ogr.FeatureDefn()
    fields = dict()
    for ft, value in data:
        ogr_ft = _FIELD_TYPE_2_ENUM_REVERSED[ft]
        defn.AddFieldDefn(ogr.FieldDefn(ft, ogr_ft))
        fields[ft] = value

    feature = Feature(id=1, fields=fields)
    ogr_feature = feature.to_ogr(defn)

    for i, (ft, expected) in enumerate(data):
        ogr_ft = _FIELD_TYPE_2_ENUM_REVERSED[ft]
        value = FIELD_GETTER[ogr_ft](ogr_feature, i)
        if ft == FIELD_TYPE.REAL:
            assert pytest.approx(value) == expected
        else:
            assert value == expected
