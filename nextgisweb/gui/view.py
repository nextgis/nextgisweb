def setup_pyramid(comp, config):
    config.add_route(
        'gui.example',
        '/test/gui/example'
    ).add_view(
        lambda request: dict(
            entrypoint='@nextgisweb/gui/example'
        ),
        renderer='nextgisweb:gui/template/react_app.mako')
