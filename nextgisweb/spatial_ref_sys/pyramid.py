from nextgisweb.env import inject

from .component import SpatialRefSysComponent
from .exception import SRSCatalogNotConfigured


@inject()
def require_catalog_configured(*, comp: SpatialRefSysComponent):
    if not comp.options["catalog.enabled"]:
        raise SRSCatalogNotConfigured()
