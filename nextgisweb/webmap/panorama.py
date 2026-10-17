from typing import ClassVar

from nextgisweb.env import gettext
from nextgisweb.lib.i18n import TrStr
from nextgisweb.lib.registry import DictRegistry, dict_registry

from nextgisweb.jsrealm import jsentry


@dict_registry
class PanoramaProvider:
    registry: ClassVar[DictRegistry[type["PanoramaProvider"]]]

    identity: ClassVar[str]
    title: ClassVar[TrStr]
    api_key: ClassVar[str]
    entry: ClassVar[str]
    requires_key: ClassVar[bool] = True


class GooglePanoramaProvider(PanoramaProvider):
    identity = "google"
    title = gettext("Google Panorama")
    api_key = "google_api_panorama_key"
    entry = jsentry("@nextgisweb/panorama/provider/GooglePanoramaProvider")
    requires_key = False


class YandexPanoramaProvider(PanoramaProvider):
    identity = "yandex"
    title = gettext("Yandex Panorama")
    api_key = "yandex_api_panorama_key"
    entry = jsentry("@nextgisweb/panorama/provider/YandexPanoramaProvider")
