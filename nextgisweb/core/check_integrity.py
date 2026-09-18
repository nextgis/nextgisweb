from collections.abc import Iterable
from itertools import chain
from typing import Protocol

import sqlalchemy as sa

from nextgisweb.env import Component, DBSession
from nextgisweb.env.hook import ComponentHook, ComponentHookProtocol

from .component import CoreComponent

CheckIntegrityResult = Iterable[str]


class CheckIntegrityProtocol(ComponentHookProtocol, Protocol):
    def __call__[C: Component](self, comp: C, /) -> CheckIntegrityResult: ...


check_integrity_hook = ComponentHook[CheckIntegrityProtocol]("check_integrity_hook")


SchemaDriftTablesResult = Iterable[sa.Table]


class SchemaDriftTablesProtocol(ComponentHookProtocol, Protocol):
    def __call__[C: Component](self, comp: C, /) -> SchemaDriftTablesResult: ...


schema_drift_tables_hook = ComponentHook[SchemaDriftTablesProtocol]("schema_drift_tables_hook")


@check_integrity_hook()
def schema_drift(comp: CoreComponent, /) -> CheckIntegrityResult:
    from .schema_drift import check_table

    tables = chain(*(tfunc(tcomp) for tcomp, tfunc in schema_drift_tables_hook))
    conn = DBSession.connection()

    for table in tables:
        for msg in check_table(table, conn):
            yield msg


@schema_drift_tables_hook()
def metadata_tables(comp: CoreComponent, /) -> SchemaDriftTablesResult:
    """Yield all metadata tables from all components in the environment"""

    for tcomp in comp.env.components.values():
        if metadata := getattr(tcomp, "metadata", None):
            assert isinstance(metadata, sa.MetaData), f"MetaData expected, got {type(metadata)}"
            yield from metadata.tables.values()
