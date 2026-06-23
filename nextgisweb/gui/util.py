from pyramid.renderers import render_to_response
from pyramid.response import Response

from ..jsrealm.entry import jsentry

REACT_RENDERER = "nextgisweb:gui/template/react_app.mako"


def _translate(request, value):
    if value is None:
        return ""

    return request.localizer.translate(value)


def react_page_model(value: dict, request, module: str) -> dict:
    from nextgisweb.pyramid.breadcrumb import breadcrumb_path
    from nextgisweb.resource import Resource

    obj = value.get("obj")
    dynmenu_resource_id = None

    if "dynmenu" not in value and obj is not None and isinstance(obj, Resource):
        dynmenu_resource_id = obj.id

    system_name = request.env.core.system_full_name()
    title = value.get("title")
    header = value.get("header", system_name)
    breadcrumbs = list(value.get("breadcrumbs", []))

    if obj is not None:
        breadcrumbs = breadcrumb_path(obj, request)

        if len(breadcrumbs) > 0 and title is None:
            title = breadcrumbs[-1].label
            breadcrumbs = breadcrumbs[:-1]

    model = dict(
        entrypoint=value.get("entrypoint", module),
        entrypointProps=value.get("props", {}),
        title=_translate(request, title),
        header=_translate(request, header),
        layoutMode=value.get("layout_mode"),
        maxwidth=value.get("maxwidth"),
        maxheight=value.get("maxheight"),
        breadcrumbs=breadcrumbs,
        hideResourceFilter=value.get("hide_resource_filter"),
        hideMenu=value.get("hide_menu"),
    )

    if dynmenu_resource_id is not None:
        model["dynMenuResourceId"] = dynmenu_resource_id

    return model


def react_renderer(module: str, *, spa: bool = False):
    jsentry(module, depth=1)

    def _react_renderer_wrap(func):
        def _react_renderer(request):
            value = func(request)
            if isinstance(value, Response):
                return value

            assert isinstance(value, dict)

            if "entrypoint" not in value:
                value["entrypoint"] = module

            model = react_page_model(value, request, module)

            return render_to_response(
                REACT_RENDERER,
                dict(value, page_model=model),
                request=request,
            )

        setattr(_react_renderer, "__wrapped__", func)
        setattr(_react_renderer, "__pyramid_react_renderer__", module)
        setattr(_react_renderer, "__pyramid_react_spa__", spa)
        return _react_renderer

    return _react_renderer_wrap
