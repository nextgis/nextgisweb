import pytest

from ...geometry import Geometry, Transformer
from ...osrhelper import sr_from_epsg


def test_transform():
    sr1 = sr_from_epsg(4326)
    sr2 = sr_from_epsg(3857)

    geom = Geometry.from_wkt("POINT (131.885 43.114)")

    transformer = Transformer(sr1.ExportToWkt(), sr2.ExportToWkt())

    result = transformer.transform(geom)
    assert result.ogr is not geom.ogr

    assert pytest.approx(result.ogr.GetX()) == 14681371
    assert pytest.approx(result.ogr.GetY()) == 5329339
