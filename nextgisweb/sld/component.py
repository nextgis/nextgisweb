import transaction

from nextgisweb.env import Component
from nextgisweb.lib.logging import logger
from nextgisweb.lib.saext import query_unreferenced

from .model import SLD


class SLDComponent(Component):
    def cleanup(self, *, dry_run):
        logger.info("Cleaning up styled layer descriptors...")

        query = query_unreferenced(SLD, SLD.id)

        if dry_run:
            records = query.count()
        else:
            with transaction.manager:
                records = query.delete(synchronize_session=False)

        logger.info("%d unreferenced SLD records found", records)
