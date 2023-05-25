from typing import Optional

from ..lib.logging import logger
from ..env.cli import cli, EnvCommand, opt


@cli.command()
def server(
    self: EnvCommand.customize(env_initialize=False),
    host: str = opt('0.0.0.0'),
    port: int = opt(8080),
    reload: Optional[bool] = opt(flag=True),
):
    """Launch development-mode web server
    
    :param host: Address to bind (default: 0.0.0.0)
    :param port: Port to bind (default: 8080)
    :param reload: Reload on file changes"""

    from waitress import serve

    reload = (self.env.core.debug if reload is None else reload)
    if reload:
        from hupper import start_reloader
        start_reloader(
            'nextgisweb.script.main',
            reload_interval=0.25)
        logger.info("File monitor started")

    self.env.initialize()

    config = self.env.pyramid.make_app({})
    app = config.make_wsgi_app()
    logger.debug("WSGI application created")

    serve(
        app, host=host, port=port, threads=1,
        clear_untrusted_proxy_headers=True)
