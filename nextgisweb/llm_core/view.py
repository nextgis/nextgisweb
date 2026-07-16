from nextgisweb.env import gettext

from nextgisweb.gui import react_renderer
from nextgisweb.pyramid import client_setting

from .component import LLMCoreComponent


@client_setting("available")
def cs_available(comp: LLMCoreComponent, request) -> bool:
    return bool(comp.get_effective("api_key"))


@client_setting("base_url")
def cs_base_url(comp: LLMCoreComponent, request) -> str | None:
    return comp.get_effective("base_url")


@client_setting("model")
def cs_model(comp: LLMCoreComponent, request) -> str | None:
    return comp.get_effective("model")


@react_renderer("@nextgisweb/llm-core/llm-settings")
def llm_settings(request):
    request.require_administrator()
    return dict(title=gettext("LLM Settings"))


def setup_pyramid(comp, config):
    config.add_route(
        "llm_core.control_panel.llm_settings",
        "/control-panel/llm-settings",
        get=llm_settings,
    )
