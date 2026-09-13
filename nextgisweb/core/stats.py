import os
from typing import Protocol

import sqlalchemy as sa

from nextgisweb.env import Component, DBSession
from nextgisweb.env.hook import ComponentHook, ComponentHookProtocol

from .component import CoreComponent


class StatsProtocol(ComponentHookProtocol, Protocol):
    def __call__[C: Component](self, comp: C, /) -> dict: ...


stats_hook = ComponentHook[StatsProtocol]("stats_hook")


@stats_hook()
def stats(comp: CoreComponent) -> dict:
    result = dict()
    result["full_name"] = comp.system_full_name()

    fs_size = 0
    for root, dirs, files in os.walk(comp.options["sdir"]):
        for f in files:
            fs_size += os.stat(os.path.join(root, f), follow_symlinks=False).st_size
    result["filesystem_size"] = fs_size

    result["database_size"] = DBSession.query(
        sa.func.pg_database_size(
            sa.func.current_database(),
        )
    ).scalar()

    if comp.options["storage.enabled"]:
        result["storage"] = comp.query_storage()

    return result
