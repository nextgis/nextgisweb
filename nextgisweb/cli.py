from typing import Optional

import transaction

from .lib.clann import command, group
from .lib.clann import arg, opt
from .lib.config import load_config
from .env import Env, setenv, env


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
        env = Env(cfg=load_config(self.config, None, hupper=True))
        setenv(env)

    def __exit__(self, type, value, traceback):
        pass


class EnvCommand(EnvOptions):
    env: Optional[Env] = None
    env_initialize: bool = True
    use_transaction: bool = False

    @classmethod
    def customize(cls, **kwargs):
        return type('CustomCommand', (cls, ), kwargs)

    def __enter__(self):
        self.env = env

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


@group()
class cli(EnvOptions):
    pass


@cli.command()
def dump_config(self: EnvCommand):
    """Print configuration as INI-file"""
    
    def print_options(identity, options):
        sprint = False
        for k, v in options._options.items():
            if not sprint:
                print('[{}]'.format(identity))
                sprint = True
            print("{} = {}".format(k, v))

    print_options('environment', self.env.options)
    for comp in self.env.chain('initialize'):
        print_options(comp.identity, comp.options)
