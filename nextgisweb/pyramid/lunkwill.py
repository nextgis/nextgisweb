from nextgisweb.env import gettext, inject

from nextgisweb.core.exception import NotConfigured

from .component import PyramidComponent
from .tomb import Configurator, Request


class LunkwillNotConfigured(NotConfigured):
    title = gettext("Lunkwill not enabled")
    message = gettext("The Lunkwill extension is not configured on this server.")


class LunkwillIntercepionExpected(NotConfigured):
    title = gettext("Interception expected")
    message = gettext("The Lunkwill extension expects external request interception.")


@inject()
def interception_expected(request: Request, *, comp: PyramidComponent = inject.arg()):
    if not comp.options["lunkwill.enabled"]:
        raise LunkwillNotConfigured
    raise LunkwillIntercepionExpected


def setup_pyramid(comp: PyramidComponent, config: Configurator):
    config.add_route(
        "lunkwill.summary",
        "/api/lunkwill/{id:str}/summary",
        get=interception_expected,
    )

    config.add_route(
        "lunkwill.response",
        "/api/lunkwill/{id:str}/response",
        get=interception_expected,
    )

    config.add_route(
        "lunkwill.hmux",
        "/api/lunkwill/hmux",
        get=interception_expected,
    )
