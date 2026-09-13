from typing import Iterable

from nextgisweb.jsrealm import jsentry
from nextgisweb.pyramid.view import template_include_hook
from nextgisweb.sentry.component import SentryComponent

INIT_JSENTRY = jsentry("@nextgisweb/sentry/init")


@template_include_hook()
def template_include(comp: SentryComponent) -> Iterable[str]:
    return ("nextgisweb:sentry/template/init.mako",) if comp.dsn_js else ()
