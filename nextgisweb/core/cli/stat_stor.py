from nextgisweb.env import inject
from nextgisweb.env.cli import EnvCommand, cli, opt
from nextgisweb.lib.json import dumps

from ..component import CoreComponent


@cli.command()
def statistics(
    self: EnvCommand,
    estimate_storage: bool = opt(False),
    *,
    core: CoreComponent = inject.arg(),
):
    """Gather statistics and print as JSON

    :param estimate_storage: Estimate storage before calculating statistics"""

    if estimate_storage:
        core.estimate_storage_all()

    result = dict()
    assert self.env is not None
    for comp in self.env.components.values():
        if func := getattr(comp, "query_stat", None):
            result[comp.identity] = func()

    print(dumps(result, pretty=True))


@cli.group()
class storage:
    """Storage accounting commands"""


@storage.command()
def estimate(self: EnvCommand, *, core: CoreComponent = inject.arg()):
    core.estimate_storage_all()
    print(dumps(core.query_storage()))
