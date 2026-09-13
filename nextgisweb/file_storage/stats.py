import sqlalchemy as sa

from nextgisweb.env import DBSession

from nextgisweb.core.stats import stats_hook

from .component import FileStorageComponent
from .model import FileObj


@stats_hook()
def stats(comp: FileStorageComponent) -> dict:
    total_count = 0
    total_size = 0
    total_max = 0
    component = dict()
    for cid, count, csize, cmax in DBSession.query(
        FileObj.component,
        sa.func.count(FileObj.id),
        sa.func.sum(FileObj.size).cast(sa.BigInteger),
        sa.func.max(FileObj.size).cast(sa.BigInteger),
    ).group_by(FileObj.component):
        total_count += count
        total_size += csize
        total_max = max(total_max, cmax)
        component[cid] = dict(count=count, size=csize, max=cmax)

    return dict(
        dict(count=total_count, size=total_size, max=total_max),
        component=component,
    )
