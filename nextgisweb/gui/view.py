from pyramid.renderers import render_to_response

from nextgisweb.jsrealm import jsentry

from .util import REACT_RENDERER

REACT_BOOT_JSENTRY = jsentry("@nextgisweb/gui/react-boot")


def react_renderer_factory(info):
    def _render(value, system):
        request = system.get("request")
        response = render_to_response(REACT_RENDERER, value, request=request)
        request.response.content_type = response.content_type
        return response.body

    return _render


def setup_pyramid(comp, config):
    config.add_renderer("react", react_renderer_factory)
