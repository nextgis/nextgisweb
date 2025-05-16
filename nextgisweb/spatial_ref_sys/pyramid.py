from typing import Annotated

from msgspec import Meta

from nextgisweb.env import gettext, inject

from nextgisweb.core.exception import NotConfigured
from nextgisweb.pyramid.view import ModelFactory

from .component import SpatialRefSysComponent
from .model import SRID_MAX, SRS

SRSID = Annotated[
    int,
    Meta(ge=1, le=SRID_MAX, description="Spatial reference system ID"),
    Meta(examples=[4326]),
]

srs_factory = ModelFactory(SRS, tdef=SRSID)


class SRSCatalogNotConfigured(NotConfigured):
    title = gettext("Catalog not cofigured")
    message = gettext("The spatial reference system catalog is not configured on this server.")


@inject()
def require_catalog_configured(*, comp: SpatialRefSysComponent):
    if not comp.options["catalog.enabled"]:
        raise SRSCatalogNotConfigured
