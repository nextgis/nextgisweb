from nextgisweb.env.cli import InTransactionCommand, comp_cli

from .model import synchronize_postgis_spatial_ref_sys


@comp_cli.command()
def sync_postgis(self: InTransactionCommand):
    """Force PostGIS spatial_ref_sys table synchronization

    This may be needed after PostGIS upgrade or manual restoration of PostgreSQL
    database from a dump during major PostgreSQL upgrades."""

    synchronize_postgis_spatial_ref_sys()
