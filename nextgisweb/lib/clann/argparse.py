import argparse


class ArgumentParser(argparse.ArgumentParser):
    def __init__(self, add_help=True, **kwargs):
        super().__init__(add_help=False, allow_abbrev=False, **kwargs)
        if add_help:
            self.add_argument(
                "-h",
                "--help",
                action="help",
                help="Show this help message and exit",
            )

        self.register("action", "flag", FlagAction)


class FlagAction(argparse.Action):
    def __init__(self, option_strings, nargs=None, **kwargs):
        if len(option_strings) != 1 or option_strings[0][0:2] != "--":
            raise ValueError(f"single long option required: {option_strings}")

        self.opt_true = option_strings[0]
        self.opt_false = "--no-" + option_strings[0][2:]

        if nargs is not None:
            raise ValueError("nargs not allowed")

        super().__init__([self.opt_true, self.opt_false], nargs=0, **kwargs)

    def __call__(self, parser, namespace, values, option_string=None):
        setattr(namespace, self.dest, option_string == self.opt_true)
