from .util import REACT_RENDERER


def setup_pyramid(comp, config):
    config.add_route(
        'gui.example',
        '/test/gui/example'
    ).add_view(
        lambda request: dict(
            entrypoint='@nextgisweb/gui/example'
        ),
        renderer=REACT_RENDERER)
