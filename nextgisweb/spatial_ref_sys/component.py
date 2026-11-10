from sqlalchemy.exc import NoResultFound

from nextgisweb.env import Component

from .model import SRS, WKT_EPSG_3857, WKT_EPSG_4326


class SpatialRefSysComponent(Component):
    def initialize_db(self):
        srs_list = (
            SRS(
                id=4326,
                display_name="WGS 84 / Lon-lat (EPSG:4326)",
                auth_name="EPSG",
                auth_srid=4326,
                wkt=WKT_EPSG_4326,
                minx=-180,
                miny=-90,
                maxx=180,
                maxy=90,
            ),
            SRS(
                id=3857,
                display_name="WGS 84 / Pseudo-Mercator (EPSG:3857)",
                auth_name="EPSG",
                auth_srid=3857,
                wkt=WKT_EPSG_3857,
                minx=-20037508.34,
                miny=-20037508.34,
                maxx=20037508.34,
                maxy=20037508.34,
            ),
        )

        for srs in srs_list:
            try:
                SRS.filter_by(id=srs.id).one()
            except NoResultFound:
                srs.persist()

    def setup_pyramid(self, config):
        from . import api, view

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)
