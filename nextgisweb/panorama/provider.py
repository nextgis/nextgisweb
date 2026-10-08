from typing import ClassVar

from nextgisweb.env import gettext
from nextgisweb.lib.registry import DictRegistry, dict_registry

from nextgisweb.jsrealm import jsentry

from .component import PanoramaComponent


@dict_registry
class PanoramaProvider:
    registry: ClassVar[DictRegistry[type["PanoramaProvider"]]]

    identity: ClassVar[str]
    title: ClassVar[str]
    settings_key: ClassVar[str]
    jsentry: ClassVar[str]
    requires_key: ClassVar[bool] = True


registry = PanoramaProvider.registry


class YandexPanoramaProvider(PanoramaProvider):
    identity = "yandex"
    title = gettext("Yandex Panorama")
    settings_key = "yandex_api_key"
    jsentry = jsentry("@nextgisweb/panorama/provider/YandexPanoramaProvider")


class GooglePanoramaProvider(PanoramaProvider):
    identity = "google"
    title = gettext("Google Panorama")
    settings_key = "google_api_key"
    jsentry = jsentry("@nextgisweb/panorama/provider/GooglePanoramaProvider")
    requires_key = False


def get_active_provider(comp: PanoramaComponent) -> type[PanoramaProvider] | None:
    identity = comp.options.get("active_provider")
    if identity is None:
        return None

    provider = PanoramaProvider.registry.get(identity)
    if provider is None:
        return None

    if provider.requires_key and not comp.options.get(provider.settings_key):
        return None

    return provider
