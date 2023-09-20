from .base import EnvCommand, cli


@cli.command()
def dump_config(self: EnvCommand):
    """Print configuration as INI-file"""

    def print_options(identity, options):
        sprint = False
        for k, v in options._options.items():
            if not sprint:
                print("[{}]".format(identity))
                sprint = True
            print("{} = {}".format(k, v))

    print_options("environment", self.env.options)
    for comp in self.env.chain("initialize"):
        print_options(comp.identity, comp.options)
