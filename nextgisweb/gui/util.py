from pyramid.renderers import render_to_response
from pyramid.response import Response

from ..jsrealm.entry import jsentry

REACT_RENDERER = "nextgisweb:gui/template/react_app.mako"


def react_renderer(module: str):
    jsentry(module, depth=1)

    def _react_renderer_wrap(func):
        def _react_renderer(request):
            value = func(request)
            if isinstance(value, Response):
                return value

            assert isinstance(value, dict)
            if "entrypoint" not in value:
                value["entrypoint"] = module

            return render_to_response(
                REACT_RENDERER,
                value,
                request=request,
            )

        setattr(_react_renderer, "__wrapped__", func)
        setattr(_react_renderer, "__pyramid_react_renderer__", module)
        return _react_renderer

    return _react_renderer_wrap
