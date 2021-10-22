from pathlib import Path

import pytest

from nextgisweb.lib.migration.migration import MigrationKey
from nextgisweb.lib.migration.registry import (
    PythonModuleMigration, SQLScriptMigration, Registry)

data_mformat = Path(__file__).parent / 'mformat'
data_registry = Path(__file__).parent / 'registry'


def mk(revision):
    return MigrationKey('default', revision)


def test_python_module_migration():
    migs = list(PythonModuleMigration.scandir('default', data_mformat))

    assert len(migs) == 2
    m1, m2 = migs

    assert m1.key == mk('00000001')
    assert m1.parents == (mk('00000000'), )

    assert m2.key == mk('00000002')
    assert m2.parents == (mk('00000001'), )

    assert m1.has_forward and not m2.has_rewind


def test_sql_script_migration():
    migs = list(SQLScriptMigration.scandir('default', data_mformat))
    assert len(migs) == 1
    mig = migs[0]

    assert mig.key == mk('00000003')
    assert mig.parents == (mk('00000002'), )

    assert mig.has_forward and mig.has_rewind
    assert len(mig.dependencies) == 2


@pytest.fixture(scope='module')
def registry():
    value = Registry()
    for c in ('foo', 'bar'):
        value.scandir(c, data_registry / c)
    yield value


def test_registry(registry):
    pass
