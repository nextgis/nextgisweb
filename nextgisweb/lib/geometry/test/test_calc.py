import pytest
from pyproj import CRS

from nextgisweb.lib.geometry import Geometry, geom_area, geom_length, Transformer


wkt_gorky_theater_lhr = 'POLYGON((14682273 5329594,14682300 5329697,14682359 5329681,14682331 5329577,14682273 5329594))'


@pytest.mark.parametrize('wkt_geom, epsg_geom, epsg_calc, area, length', (
    (wkt_gorky_theater_lhr, 3857, 4326, -3466, 245),
))
def test_geom_area(wkt_geom, epsg_geom, epsg_calc, area, length):
    geom = Geometry.from_wkt(wkt_geom)
    crs_geom = CRS.from_epsg(epsg_geom).to_wkt()
    crs_calc = CRS.from_epsg(epsg_calc).to_wkt()
    geom = Transformer(crs_geom, crs_calc).transform(geom)

    assert geom_area(geom, crs_calc) == pytest.approx(area, abs=abs(area) * 0.05)
    assert geom_length(geom, crs_calc) == pytest.approx(length, abs=abs(length) * 0.05)
