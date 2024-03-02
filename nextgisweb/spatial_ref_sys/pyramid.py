from nextgisweb.env import gettext, inject

from nextgisweb.core.exception import NotConfigured

from .component import SpatialRefSysComponent


class SRSCatalogNotConfigured(NotConfigured):
    title = gettext("Catalog not cofigured")
    message = gettext("The spatial reference system catalog is not configured on this server.")


@inject()
def require_catalog_configured(*, comp: SpatialRefSysComponent):
    if not comp.options["catalog.enabled"]:
        raise SRSCatalogNotConfigured
