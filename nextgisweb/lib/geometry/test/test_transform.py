import pytest

from ...geometry import Geometry, Transformer
from ...osrhelper import sr_from_epsg, sr_from_wkt


def test_transform():
    sr1 = sr_from_epsg(4326)
    sr2 = sr_from_epsg(3857)

    geom = Geometry.from_wkt("POINT (131.885 43.114)")

    transformer = Transformer(sr1.ExportToWkt(), sr2.ExportToWkt())

    result = transformer.transform(geom)
    assert result.ogr is not geom.ogr

    assert pytest.approx(result.ogr.GetX()) == 14681371
    assert pytest.approx(result.ogr.GetY()) == 5329339


invalid_cs_parameters = [
    """LOCAL_CS["Nonearth", UNIT["Meter",1]]""",
    """ENGCRS["Nonearth",EDATUM[""],CS[Cartesian,2],AXIS["(E)",east,ORDER[1],LENGTHUNIT["Meter",1]],AXIS["(N)",north,ORDER[2],LENGTHUNIT["Meter",1]]]""",
]


@pytest.mark.parametrize("invalid_cs", invalid_cs_parameters)
def test_transform_invalid_cs_should_raise_ValueError(invalid_cs):
    sr_invalid = sr_from_wkt(invalid_cs)
    sr_web_mercator = sr_from_epsg(3857)

    geom = Geometry.from_wkt("POINT (100 100)")

    transformer = Transformer(sr_invalid.ExportToWkt(), sr_web_mercator.ExportToWkt())

    with pytest.raises(ValueError):
        transformer.transform(geom)
