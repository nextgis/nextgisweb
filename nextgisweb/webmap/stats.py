import sqlalchemy as sa

from nextgisweb.env import DBSession

from nextgisweb.core.stats import stats_hook

from .component import WebMapComponent
from .model import WebMapItem


@stats_hook()
def stats(comp: WebMapComponent) -> dict:
    return dict(
        item_type={
            k: v
            for (k, v) in DBSession.query(
                WebMapItem.item_type,
                sa.func.count(WebMapItem.id),
            ).group_by(WebMapItem.item_type)
        }
    )
