from nextgisweb.gui import REACT_RENDERER
from nextgisweb.pyramid import client_setting
from nextgisweb.pyramid.tomb import (
    Configurator,
    HTTPNotFound,
    Request,
    render_to_response,
)

from .component import PanoramaComponent
from .provider import get_active_provider


@client_setting("isProviderConfigured")
def cs_active_provider(comp: PanoramaComponent, request: Request) -> bool:
    return get_active_provider(comp) is not None


def viewer(request: Request):
    comp = request.env.component(PanoramaComponent)
    provider = get_active_provider(comp)
    if provider is None:
        raise HTTPNotFound()

    api_key = comp.options.get(provider.settings_key)
    title = request.translate(provider.title)

    return render_to_response(
        REACT_RENDERER,
        dict(
            entrypoint=provider.jsentry,
            props=dict(apiKey=api_key, title=title),
            layout_mode="nullSpace",
            title=provider.title,
        ),
        request=request,
    )


def setup_pyramid(comp: PanoramaComponent, config: Configurator):
    config.add_route("panorama.viewer", "/panorama/", get=viewer)
