from nextgisweb.core.stats import stats_hook

from .component import SpatialRefSysComponent
from .model import SRS


@stats_hook()
def stats(comp: SpatialRefSysComponent) -> dict:
    return dict(count=SRS.query().count())
