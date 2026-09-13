import sqlalchemy as sa

from nextgisweb.env import DBSession

from nextgisweb.core.stats import stats_hook

from .component import ResourceComponent
from .model import Resource


@stats_hook()
def stats(comp: ResourceComponent) -> dict:
    query = DBSession.query(Resource.cls, sa.func.count(Resource.id)).group_by(Resource.cls)

    total = 0
    by_cls = dict()
    for cls, count in query.all():
        by_cls[cls] = count
        total += count

    query = DBSession.query(sa.func.max(Resource.creation_date))
    cdate = query.scalar()

    return dict(resource_count=dict(total=total, cls=by_cls), last_creation_date=cdate)
