from datetime import timedelta

from sqlalchemy.orm.exc import NoResultFound

from ..component import Component
from ..lib.config import Option
from .util import COMP_ID
from .model import Base, SRS, SRSMixin, WKT_EPSG_4326, WKT_EPSG_3857

__all__ = ['SpatialRefSysComponent', 'SRS', 'SRSMixin']


class SpatialRefSysComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    def initialize_db(self):
        srs_list = (
            SRS(
                id=4326,
                display_name="WGS 84 / Lon-lat (EPSG:4326)",
                auth_name="EPSG", auth_srid=4326,
                wkt=WKT_EPSG_4326,
                minx=-180, miny=-90,
                maxx=180, maxy=90
            ),
            SRS(
                id=3857,
                display_name="WGS 84 / Pseudo-Mercator (EPSG:3857)",
                auth_name="EPSG", auth_srid=3857,
                wkt=WKT_EPSG_3857,
                minx=-20037508.34, miny=-20037508.34,
                maxx=20037508.34, maxy=20037508.34
            ),
        )

        for srs in srs_list:
            try:
                SRS.filter_by(id=srs.id).one()
            except NoResultFound:
                srs.persist()

    def setup_pyramid(self, config):
        from . import view, api
        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def client_settings(self, request):
        cat_opts = self.options.with_prefix('catalog')
        return dict(catalog=dict(
            enabled=cat_opts['enabled'],
            url=cat_opts['url'] if cat_opts['enabled'] else None,
            coordinates_search=cat_opts['coordinates_search'],
        ))

    def query_stat(self):
        return dict(count=SRS.query().count())

    option_annotations = (
        Option('catalog.enabled', bool, default=False),
        Option('catalog.url'),
        Option('catalog.timeout', timedelta, default=timedelta(seconds=15), doc="Catalog request timeout."),
        Option('catalog.coordinates_search', bool, default=False),
    )
