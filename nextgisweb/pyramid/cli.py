from nextgisweb.env.cli import UninitializedEnvCommand, cli, opt
from nextgisweb.lib.logging import logger

from nextgisweb.core import CoreComponent

from .component import PyramidComponent


def _serve(self, *, host: str, port: int, reload: bool | None, core, pyramid):
    from waitress import serve

    reload = core.debug if reload is None else reload
    if reload:
        from hupper import start_reloader

        start_reloader("nextgisweb.script.main", reload_interval=0.25)
        logger.info("File monitor started")

    self.env.initialize()

    config = pyramid.make_app({})
    app = config.make_wsgi_app()
    logger.debug("WSGI application created")

    # NOTE: Don't need to clear untrusted headers for a development-only server
    serve(app, host=host, port=port, threads=1, clear_untrusted_proxy_headers=False)


@cli.command()
def server(
    self: UninitializedEnvCommand,
    host: str = opt("0.0.0.0"),
    port: int = opt(8080),
    reload: bool | None = opt(flag=True),
    *,
    core: CoreComponent,
    pyramid: PyramidComponent,
):
    """Launch development-mode web server

    :param host: Address to bind (default: 0.0.0.0)
    :param port: Port to bind (default: 8080)
    :param reload: Reload on file changes"""

    _serve(self, host=host, port=port, reload=reload, core=core, pyramid=pyramid)


@cli.command(name="server-hmr")
def server_hmr(
    self: UninitializedEnvCommand,
    host: str = opt("0.0.0.0"),
    port: int = opt(8080),
    reload: bool | None = opt(flag=True),
    *,
    core: CoreComponent,
    pyramid: PyramidComponent,
):
    """Launch development-mode web server with HMR

    :param host: Address to bind (default: 0.0.0.0)
    :param port: Port to bind (default: 8080)
    :param reload: Reload on file changes"""

    pyramid.jsrealm_dev_server_url = "http://localhost:3000/"
    _serve(self, host=host, port=port, reload=reload, core=core, pyramid=pyramid)
