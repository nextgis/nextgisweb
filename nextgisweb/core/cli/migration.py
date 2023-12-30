from datetime import datetime
from pathlib import Path
from typing import List, Optional

import transaction
from zope.sqlalchemy import mark_changed

from nextgisweb.env import DBSession
from nextgisweb.env.cli import DryRunOptions, EnvCommand, UninitializedEnvCommand, arg, cli, opt
from nextgisweb.lib.logging import logger
from nextgisweb.lib.migration import (
    REVID_ZERO,
    MigrationKey,
    PythonModuleMigration,
    RewindOperation,
    SQLScriptMigration,
    UninstallOperation,
    resolve,
    revid,
)

from ..component import CoreComponent
from ..migration import MigrationContext, MigrationRegistry


@cli.command()
def initialize_db(
    self: EnvCommand,
    drop: bool = opt(False),
    *,
    core: CoreComponent,
):
    """Initialize the database

    :param drop: Attempt to drop existing objects"""

    metadata = self.env.metadata()

    with transaction.manager:
        connection = DBSession.connection()

        if drop:
            metadata.drop_all(connection)

        metadata.create_all(connection)

        for comp in self.env.chain("initialize_db"):
            comp.initialize_db()

        # Set migrations status
        reg = MigrationRegistry(self.env)
        nstate = {k: True for k in reg.graph.select("all")}
        reg.write_state(nstate)

        # DDL commands don't change session status!
        mark_changed(DBSession())

    if core.check_update():
        logger.info("New update available.")


@cli.group()
class migration:
    """Database migration commands"""


class RegistryMixin:
    registry: MigrationRegistry

    def __enter__(self):
        super().__enter__()
        self.registry = MigrationRegistry(self.env)


class NoExecuteOptions:
    no_execute: bool = opt(False, doc="Change migration metadata only (advanced)")


class MigrationApplyCommand(
    DryRunOptions,
    NoExecuteOptions,
    RegistryMixin,
    EnvCommand,
):
    def __call__(self):
        reg = self.registry
        self.graph = graph = reg.graph

        self.cstate = {r: False for r in graph._nodes}
        self.tstate = {}

        self.destructive = False
        self.of_install = False
        self.of_uninstall = False
        self.of_forward = False
        self.of_rewind = False

        self.setup_target()

        operations = graph.operations(
            install=self.of_install,
            uninstall=self.of_uninstall,
            forward=self.of_forward,
            rewind=self.of_rewind,
        )

        solution = resolve(operations, self.cstate, self.tstate)
        if solution is None:
            print("No migration solution found! Exitting!")
            exit(1)

        if not self.destructive:
            for op in solution:
                if isinstance(op, (UninstallOperation, RewindOperation)):
                    raise RuntimeError("Destructive operation protection!")

        if len(solution) == 0:
            print("There are no changes required. It's OK!")
            exit(0)

        elif self.dry_run:
            print("The following operations would be applied:\n")
            for idx, op in enumerate(solution, start=1):
                print("{:3d}. {}".format(idx, op))
            print("\nUse --no-dry-run option to actually run them.")
            exit(0)

        elif self.no_execute:
            state = dict(self.cstate)
            for op in solution:
                state = op.apply(state)
            with transaction.manager:
                reg.write_state(state)

        else:
            print("Executing the following migrations:\n")
            for idx, op in enumerate(solution, start=1):
                print("{:3d}. {}".format(idx, op))
            print("")

            ctx = MigrationContext(self.registry, self.env)
            ctx.execute_operations(solution, self.cstate)

            print("Migration operations completed!")

    def setup_target(self):
        raise NotImplementedError


class ComponentMigrationCommand(MigrationApplyCommand):
    component: List[str] = arg(doc="Component identity")


class RevisionMigrationCommand(MigrationApplyCommand):
    revision: str = arg(metavar="migration", doc="Migration in component:revision format")

    def __enter__(self):
        super().__enter__()
        self.mkey = MigrationKey(*self.revision.split(":"))


@migration.command()
class status(RegistryMixin, EnvCommand):
    """Show current migration status"""

    def __call__(self):
        cstate = self.registry.read_state()
        print("A |    | Migration                      | Message")
        for m in self.registry._all_migrations.values():
            print(
                "{} | {}{} | {:30} | {}".format(
                    "+" if m.key in cstate else " ",
                    "F" if m._has_forward else " ",
                    "R" if m._has_rewind else " ",
                    m.component + ":" + m.revision,
                    m._message,
                )
            )


@migration.command()
class create(RegistryMixin, UninitializedEnvCommand):
    """Create a new migration boilerplate"""

    format: str = opt(
        "sql", choices=("sql", "python"), doc=("SQL (default) or Python migration format")
    )
    parent: Optional[str] = opt(
        metavar="REV", doc=("Start from a given revision (excludes --merge)")
    )
    merge: Optional[List[str]] = opt(
        nargs=2, metavar="REV", doc=("Merge two given revisions (excludes --parent)")
    )
    date: Optional[str] = opt(doc="Override migration date")

    component: str = arg(doc="Component identity")
    message: str = arg(doc="Migration message")

    def __call__(self):
        reg = MigrationRegistry(self.env)
        graph = reg.graph
        component = self.component

        if self.parent and self.merge:
            raise ValueError("--parent and --merge are exclusive")
        elif self.parent:
            parents = [self.parent]
        elif self.merge:
            parents = list(self.merge[0])
        else:
            heads = list(graph.select("head", component=component))
            if len(heads) == 1:
                parents = [h.revision for h in heads]
            elif len(heads) == 0:
                parents = (REVID_ZERO,)
            else:
                raise ValueError("Use --parents option!")

        date = datetime.fromisoformat(self.date) if (self.date is not None) else datetime.now()
        revision = revid(date)
        mcls = {"python": PythonModuleMigration, "sql": SQLScriptMigration}[self.format]

        mpath = reg.migration_path(component)
        if not mpath.exists():
            logger.info("Creating directory {}".format(mpath))
            mpath.mkdir()

        outfiles = mcls.template(
            reg.migration_path(component),
            revision,
            parents=parents,
            date=date,
            message=self.message,
        )

        # Use relative paths only if possible
        try:
            cwd = Path().resolve()
            outfiles = [p.resolve().relative_to(cwd) for p in outfiles]
        except ValueError:
            outfiles = [p.resolve() for p in outfiles]

        print(
            "Migration [{}:{}] created:\n* ".format(component, revision)
            + "\n* ".join(map(str, outfiles))
        )


@migration.command()
class init(MigrationApplyCommand):
    """Initialize database schema"""

    def setup_target(self):
        self.tstate = {r: True for r in self.graph.select("head")}
        self.of_install = True


@migration.command()
class upgrade(MigrationApplyCommand):
    """Update schema to the latest"""

    def setup_target(self):
        self.cstate.update(self.registry.read_state())
        self.tstate = {r: True for r in self.graph.select("head")}
        self.of_install = True
        self.of_forward = True


@migration.command()
class install(ComponentMigrationCommand):
    """Install one or more components"""

    def setup_target(self):
        self.cstate.update(self.registry.read_state())
        self.tstate = dict(self.cstate)
        for c in self.component:
            self.tstate.update({k: True for k in self.graph.select("head", component=c)})
        self.of_install = True


@migration.command()
class uninstall(ComponentMigrationCommand):
    """Uninstall one or more components"""

    def setup_target(self):
        self.destructive = True
        self.cstate.update(self.registry.read_state())
        self.tstate = dict()
        for cid in self.component:
            self.tstate.update({k: False for k in self.graph.select("all", component=cid)})
        self.of_uninstall = True


@migration.command()
class forward(RevisionMigrationCommand):
    def setup_target(self):
        self.cstate.update(self.registry.read_state())
        self.tstate = dict(self.cstate)
        self.tstate[self.mkey] = True
        self.of_forward = True


@migration.command()
class rewind(RevisionMigrationCommand):
    def setup_target(self):
        self.destructive = True
        self.cstate.update(self.registry.read_state())
        self.tstate = dict(self.cstate)
        self.tstate[self.mkey] = False
        self.of_rewind = True
