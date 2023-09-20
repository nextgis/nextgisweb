from nextgisweb.lib.clann import arg, opt

from . import dump_config
from .base import DryRunOptions, EnvCommand, EnvOptions, bootstrap, cli


def __getattr__(name):
    if name == "comp_cli":
        from .base import _comp_cli

        return _comp_cli()

    raise AttributeError
