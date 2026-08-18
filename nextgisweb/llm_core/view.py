from nextgisweb.pyramid import client_setting
from nextgisweb.pyramid.tomb import Request

from .component import LLMCoreComponent


@client_setting("available")
def cs_available(comp: LLMCoreComponent, request: Request) -> bool:
    return comp.available


def setup_pyramid(comp: LLMCoreComponent, config):
    pass
