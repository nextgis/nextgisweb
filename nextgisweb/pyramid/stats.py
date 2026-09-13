from nextgisweb.env import inject

from nextgisweb.core import CoreComponent
from nextgisweb.core.stats import stats_hook

from .component import PyramidComponent


@stats_hook()
@inject()
def stats(comp: PyramidComponent, *, core: CoreComponent = inject.arg()) -> dict:
    result = dict()

    try:
        result["cors"] = len(core.settings_get("pyramid", "cors_allow_origin")) > 0
    except KeyError:
        result["cors"] = False

    try:
        result["custom_css"] = core.settings_get("pyramid", "custom_css").strip() != ""
    except KeyError:
        result["custom_css"] = False

    return result
