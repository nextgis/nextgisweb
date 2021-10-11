import logging
from collections import defaultdict
from importlib import import_module
from pathlib import Path

import transaction
from zope.sqlalchemy import mark_changed

from ..models import DBSession
from ..lib.migration import (
    MigrationKey, InitialMigration,
    Registry, MigrationGraph,
    InstallOperation, UninstallOperation,
    ForwardOperation, RewindOperation,
    PythonModuleMigration, SQLScriptMigration)

from .model import Migration as MigrationModel

_logger = logging.getLogger(__name__)


class MigrationRegistry(Registry):

    def __init__(self, env):
        super().__init__()
        self._env = env

        for cid, cobj in env._components.items():
            self.scandir(cid, self.migration_path(cid))
            if cid not in self._by_component and hasattr(cobj, 'metadata'):
                self.add(InitialMigration(cid))

        self.validate()

    def migration_path(self, comp_id):
        mod = import_module(self._env._components[comp_id].__class__.__module__)
        path = Path(mod.__file__).parent / 'migration'
        return path

    @property
    def graph(self):
        if hasattr(self, '_graph'):
            return self._graph

        # Collect metadata dependencies
        dependencies = defaultdict(set)
        for cid, comp in self._env._components.items():
            metadata = getattr(comp, 'metadata', None)
            if metadata is not None:
                for dependent in metadata.dependencies:
                    dependencies[cid].add(dependent)
                if cid != 'core':
                    dependencies[cid].add('core')

        self._graph = MigrationGraph(self, dependencies)
        return self._graph

    def read_state(self, ancestors=True):
        known = self.graph.select('all')
        result = dict()
        for row in MigrationModel.query():
            mk = MigrationKey(row.component, row.revision)
            if mk in known:
                result[mk] = True
            else:
                _logger.warn("Unknown migration found: {}".format(mk))

        # Set all ancestor migrations to applied state
        if ancestors:
            for anc in self.graph.ancestors(tuple(result.keys()), True):
                if anc not in result:
                    _logger.warn("Setting [{}] to applied state".format(anc))
                    result[anc] = True

        return result

    def write_state(self, state, components=None):
        # Compute the actual difference between given and current states

        cstate = self.read_state(ancestors=False)
        insert, delete = list(), list()
        for k, v in state.items():
            if components is not None and k.component not in components:
                continue
            c = cstate.get(k, False)
            if v and not c:
                insert.append(k)
            elif not v and c:
                delete.append(k)

        if len(insert) > 0:
            _logger.debug('Insert migrations: ' + ', '.join(
                map(str, sorted(insert))))
        if len(delete) > 0:
            _logger.debug('Delete migrations: ' + ', '.join(
                map(str, sorted(delete))))

        # Write changes

        for i in insert:
            MigrationModel(
                component=i.component,
                revision=i.revision,
            ).persist()

        for d in delete:
            m = MigrationModel.filter_by(
                component=d.component,
                revision=d.revision
            ).first()
            if m is not None:
                DBSession.delete(m)


class MigrationContext(object):

    def __init__(self, registry, env):
        self.registry = registry
        self.env = env

    def execute_operations(self, operations, state, dry_run=False):
        frops = list()
        iops = list()
        uops = list()

        iofirst, iolast = False, False
        uofirst, uolast = False, False

        for op in operations:
            if isinstance(op, InstallOperation):
                if not iofirst:
                    iofirst = True
                assert not iolast
                iops.append(op)
            else:
                if iofirst and not iolast:
                    iolast = True

            if isinstance(op, UninstallOperation):
                if not uofirst:
                    uofirst = True
                assert not uolast
                uops.append(op)
            else:
                if uofirst and not uolast:
                    uolast = True

            if not isinstance(op, (InstallOperation, UninstallOperation)):
                frops.append(op)

        with transaction.manager:
            for op in frops:
                state = self.execute_operation(op, state)
                self.registry.write_state(state, components=(op.component, ))

            if len(iops) > 0:
                state = self.execute_install(iops, state)
                self.registry.write_state(state)

            if len(uops) > 0:
                state = self.execute_uninstall(uops, state)
                self.registry.write_state(state)

            mark_changed(DBSession())

    def execute_install(self, operations, state):
        components = [op.component for op in operations]
        _logger.info("Installation for components: {}".format(', '.join(components)))

        metadata, tables = self._metadata_for_components(components)
        metadata.create_all(DBSession.connection(), tables)

        for op in operations:
            state = op.apply(state)

        # Run initialize_db after component installation
        for comp in self.env.chain('initialize_db'):
            if comp.identity in components:
                _logger.debug("Executing initialize_db for [{}] component".format(comp.identity))
                comp.initialize_db()

        return state

    def execute_uninstall(self, operations, state):
        components = [op.component for op in operations]

        # Protection against uninstalling important components
        not_uninstallable = set((
            'core', 'file_storage', 'spatial_ref_sys',
            'auth', 'resource'))
        danger = set(components) & not_uninstallable
        if len(danger) > 0:
            raise RuntimeError('Components {} is not uninstallable!'.format(
                ', '.join(danger)))

        _logger.info("Uninstallation for components: {}".format(', '.join(components)))

        metadata, tables = self._metadata_for_components(components)
        metadata.drop_all(DBSession.connection(), tables)

        for op in operations:
            state = op.apply(state)
        return state

    def execute_operation(self, operation, state):
        if isinstance(operation, (ForwardOperation, RewindOperation)):
            mig = operation.migration
            if isinstance(mig, PythonModuleMigration):
                m = getattr(mig, '{}_callable'.format(operation.opname))
                m(self)
            elif isinstance(mig, SQLScriptMigration):
                s = getattr(mig, '{}_script'.format(operation.opname))
                DBSession.connection().execute(s())

        return operation.apply(state)

    def _metadata_for_components(self, components):
        metadata = self.env.metadata()
        tables = [t for t in metadata.tables.values() if t._component_identity in components]
        _logger.debug("Tables selected: {}".format(', '.join(map(str, tables))))
        return metadata, tables
