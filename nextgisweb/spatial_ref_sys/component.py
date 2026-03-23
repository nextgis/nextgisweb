from datetime import timedelta
from enum import Enum

from sqlalchemy.exc import NoResultFound

from nextgisweb.env import Component
from nextgisweb.lib.config import Option

from .model import SRS, WKT_EPSG_3857, WKT_EPSG_4326


class CatalogSource(Enum):
    REMOTE = "remote"
    PROJ = "proj"


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

    @property
    def catalog_source(self) -> CatalogSource:
        return CatalogSource.REMOTE if self.options["catalog.url"] else CatalogSource.PROJ

    def query_stat(self):
        return dict(count=SRS.query().count())

    # fmt: off
    option_annotations = (
        Option("catalog.url", default=None, doc="Remote catalog URL. If not set, local PROJ data is used."),
        Option("catalog.timeout", timedelta, default=timedelta(seconds=15), doc="Catalog request timeout."),
        Option("catalog.coordinates_search", bool, default=False),
    )
    # fmt: on
