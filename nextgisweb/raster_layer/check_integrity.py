from collections.abc import Iterator
from typing import cast

from nextgisweb.core import CheckIntegrityResult, check_integrity_hook

from .component import RasterLayerComponent
from .model import RasterLayer


@check_integrity_hook()
def check_integrity(comp: RasterLayerComponent) -> CheckIntegrityResult:
    for res in cast(Iterator[RasterLayer], RasterLayer.query()):
        if (err := res._check_integrity()) is not None:
            yield f"{err} [{RasterLayer.cls_display_name} #{res.id}]"
