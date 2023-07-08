from nextgisweb.env import COMP_ID, Component, require
from nextgisweb.lib.config import Option


class BasemapComponent(Component):
    identity = COMP_ID

    def initialize(self):
        from . import plugin  # noqa: F401

    @require('resource', 'webmap')
    def setup_pyramid(self, config):
        from . import view  # noqa: F401

    def client_settings(self, request):
        return dict(
            qms_geoservices_url=self.options['qms_geoservices_url'],
            qms_icons_url=self.options['qms_icons_url'])

    option_annotations = (
        Option('qms_geoservices_url', default='https://qms.nextgis.com/api/v1/geoservices/',
               doc="Geo Services QMS API URL"),
        Option('qms_icons_url', default='https://qms.nextgis.com/api/v1/icons/',
               doc="Icons QMS API URL"),
    )
