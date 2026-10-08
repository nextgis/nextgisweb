from nextgisweb.env import Component
from nextgisweb.lib.config import Option


class PanoramaComponent(Component):
    def setup_pyramid(self, config):
        from . import provider, view  # noqa: F401

        view.setup_pyramid(self, config)

    option_annotations = (
        Option("active_provider", default=None, doc="Identity of the active panorama provider"),
        Option("yandex_api_key", default=None, doc="Yandex Maps API key for panoramas"),
        Option("google_api_key", default=None, doc="Google Maps API key for panoramas"),
    )
