import sys
from importlib.util import find_spec
from typing import Optional
from warnings import warn

import transaction

from nextgisweb.lib.clann import command, group, opt
from nextgisweb.lib.config import load_config

from .. import environment
from ..component import component_utility
from ..environment import Env, env, inject


class EnvOptions:
    config: Optional[str] = opt(metavar="path", doc="Configuration file path")


class DryRunOptions:
    no_dry_run: bool = opt(False, doc="Make changes (no changes by default)")

    @property
    def dry_run(self):
        return not self.no_dry_run


@command()
class bootstrap(EnvOptions):
    def __enter__(self):
        pass

    def __call__(self):
        if environment._env is None:
            Env(cfg=load_config(self.config, None, hupper=True), set_global=True)

        assert environment._env is not None

        # Scan for {component_module}.cli modules to populate commands
        for comp in env.components.values():
            candidate = f"{comp.module}.cli"
            if candidate not in sys.modules and find_spec(candidate):
                __import__(candidate)

    def __exit__(self, type, value, traceback):
        pass


class EnvCommand(EnvOptions):
    env: Optional[Env] = None
    env_initialize: bool = True
    use_transaction: bool = False

    @classmethod
    def customize(cls, **kwargs):
        warn(
            "EnvCommand.customize is deprecated since 4.7.0.dev1. Use "
            "InTransactionCommand or UninitializedEnvCommand instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return type("CustomCommand", (cls,), kwargs)

    def __enter__(self):
        self.env = environment._env

        if self.env_initialize:
            self.env.initialize()

        if self.use_transaction:
            assert self.env_initialize
            transaction.manager.__enter__()

    def __call__(self):
        pass

    def __exit__(self, type, value, traceback):
        if self.use_transaction:
            transaction.manager.__exit__(type, value, traceback)


class InTransactionCommand(EnvCommand):
    env_initialize = True
    use_transaction = True


class UninitializedEnvCommand(EnvCommand):
    env_initialize = False
    env_transaction = False


@group(decorator=inject())
class cli(EnvOptions):
    pass


@component_utility
def _comp_cli(component: str):
    @cli.group(name=component)
    class result:
        pass

    return result
