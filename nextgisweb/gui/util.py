from collections.abc import Callable
from typing import Any, Concatenate

from nextgisweb.pyramid.tomb import Request, Response, render_to_response

from ..jsrealm.entry import jsentry

REACT_RENDERER = "nextgisweb:gui/template/react_app.mako"

ReactViewFunc = (
    Callable[Concatenate[Request, ...], dict] | Callable[Concatenate[Any, Request, ...], dict]
)


def react_renderer[T: ReactViewFunc](module: str) -> Callable[[T], Callable[..., Response]]:
    jsentry(module, depth=1)

    def _react_renderer_wrap(func: T) -> Response:
        def _react_renderer(*args, **kwargs) -> Response:
            request = next(filter(lambda x: isinstance(x, Request), args[:2]), None)
            assert request is not None, "Request object not found in view arguments"

            value = func(*args, **kwargs)
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

        return _react_renderer  # ty: ignore[invalid-return-type]

    return _react_renderer_wrap
