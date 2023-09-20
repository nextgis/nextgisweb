import pytest

from nextgisweb.lib.osrhelper import sr_from_epsg

from .. import Geometry, Transformer, geom_area, geom_length

wkt_gorky_theater_lhr = "POLYGON((14682273 5329594,14682300 5329697,14682359 5329681,14682331 5329577,14682273 5329594))"


@pytest.mark.parametrize(
    "wkt_geom, epsg_geom, epsg_calc, area, length",
    ((wkt_gorky_theater_lhr, 3857, 4326, -3466, 245),),
)
def test_geom_area(wkt_geom, epsg_geom, epsg_calc, area, length):
    geom = Geometry.from_wkt(wkt_geom)
    crs_geom = sr_from_epsg(epsg_geom).ExportToWkt()
    crs_calc = sr_from_epsg(epsg_calc).ExportToWkt()
    geom = Transformer(crs_geom, crs_calc).transform(geom)

    assert geom_area(geom, crs_calc) == pytest.approx(area, abs=abs(area) * 0.05)
    assert geom_length(geom, crs_calc) == pytest.approx(length, abs=abs(length) * 0.05)
