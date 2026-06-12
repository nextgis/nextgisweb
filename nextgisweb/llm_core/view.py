from nextgisweb.pyramid import client_setting

from .component import LLMCoreComponent


@client_setting("available")
def cs_available(comp: LLMCoreComponent, request) -> bool:
    return comp.available


def setup_pyramid(comp, config):
    pass
