# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import sys
import os
import os.path
import logging
import fileinput
from os.path import join as pthjoin
from datetime import datetime, timedelta
from time import sleep
from tempfile import NamedTemporaryFile, mkdtemp, mkstemp
from shutil import rmtree
from contextlib import contextmanager
from backports.tempfile import TemporaryDirectory
from zipfile import ZipFile, is_zipfile
from six import ensure_text

import transaction
from zope.sqlalchemy import mark_changed
import unicodecsv as csv

from .. import geojson
from ..compat import Path, datetime_fromisoformat
from ..command import Command
from ..models import DBSession
from ..lib.migration import (
    revid, REVID_ZERO, MigrationKey, resolve,
    UninstallOperation, RewindOperation,
    PythonModuleMigration, SQLScriptMigration)

from .backup import backup, restore
from .migration import MigrationRegistry, MigrationContext


logger = logging.getLogger(__name__)


@Command.registry.register
class InitializeDBCmd():
    identity = 'initialize_db'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            '--drop', action="store_true", default=False,
            help="Try to delete existing objects from the database")

    @classmethod
    def execute(cls, args, env):
        metadata = env.metadata()

        with transaction.manager:
            connection = DBSession.connection()

            if args.drop:
                metadata.drop_all(connection)

            metadata.create_all(connection)

            for comp in env.chain('initialize_db'):
                comp.initialize_db()

            # Set migrations status
            reg = MigrationRegistry(env)
            nstate = {k: True for k in reg.graph.select('all')}
            reg.write_state(nstate)

            # DDL commands don't change session status!
            mark_changed(DBSession())


@Command.registry.register
class WaitForServiceCommand(Command):
    identity = 'wait_for_service'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--timeout', type=int, default=120)

    @classmethod
    def execute(cls, args, env):
        components = [
            (comp, comp.is_service_ready())
            for comp in env._components.values()
            if hasattr(comp, 'is_service_ready')]

        messages = dict()

        def log_messages(logfunc):
            for comp, it in components:
                if messages[comp] is not None:
                    logfunc(
                        "Message from [%s]: %s",
                        comp.identity,
                        messages[comp])

        start = datetime.now()
        timeout = start + timedelta(seconds=args.timeout)
        backoff = 1 / 8
        maxinterval = 10
        while len(components) > 0:
            nxt = []
            for comp, is_service_ready in components:
                try:
                    messages[comp] = next(is_service_ready)
                    nxt.append((comp, is_service_ready))
                except StopIteration:
                    logger.debug(
                        "Service ready for component [%s] in %0.2f seconds",
                        comp.identity, (datetime.now() - start).total_seconds())

            components = nxt
            if datetime.now() > timeout:
                log_messages(logger.error)
                logger.critical("Wait for service failed in components: {}!".format(
                    ', '.join([comp.identity for comp, it in components])))
                exit(1)

            elif len(components) > 0:
                if backoff == maxinterval:
                    log_messages(logger.info)
                    logger.info("Waiting {} seconds to retry in components: {}".format(
                        backoff, ', '.join([comp.identity for comp, it in components])))
                sleep(backoff)
                backoff = min(2 * backoff, maxinterval)


@Command.registry.register
class BackupCommand(Command):
    identity = 'backup'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            '--no-zip', dest='nozip', action='store_true',
            help='use directory instead of zip-file as backup format')

        parser.add_argument(
            'target', type=str, metavar='path', nargs='?',
            help='backup destination path')

    @classmethod
    def execute(cls, args, env):
        target = args.target
        autoname = datetime.today().strftime(env.core.options['backup.filename'])
        if target is None:
            if env.core.options['backup.path']:
                target = pthjoin(env.core.options['backup.path'], autoname)
            else:
                target = NamedTemporaryFile(delete=False).name
                os.unlink(target)
                logger.warn("Backup path not set. Writing backup to temporary file %s!", target)

        if os.path.exists(target):
            raise RuntimeError("Target already exists!")

        if args.nozip:
            @contextmanager
            def tgt_context():
                tmpdir = mkdtemp(dir=os.path.split(target)[0])
                try:
                    yield tmpdir
                    logger.debug("Renaming [%s] to [%s]...", tmpdir, target)
                    os.rename(tmpdir, target)
                except Exception:
                    rmtree(tmpdir)
                    raise

        else:
            @contextmanager
            def tgt_context():
                tmp_root = os.path.split(target)[0]
                with TemporaryDirectory(dir=tmp_root) as tmp_dir:
                    yield tmp_dir
                    tmp_arch = mkstemp(dir=tmp_root)[1]
                    os.unlink(tmp_arch)
                    try:
                        cls.compress(tmp_dir, tmp_arch)
                        logger.debug("Renaming [%s] to [%s]...", tmp_arch, target)
                        os.rename(tmp_arch, target)
                    except Exception:
                        os.unlink(tmp_arch)
                        raise

        with tgt_context() as tgt:
            backup(env, tgt)

        print(target)

    @classmethod
    def compress(cls, src, dst):
        logger.debug("Compressing '%s' to '%s'...", src, dst)
        with ZipFile(dst, 'w', allowZip64=True) as zipf:
            for root, dirs, files in os.walk(src):
                zipf.write(root, os.path.relpath(root, src))
                for fn in files:
                    filename = os.path.join(root, fn)
                    if os.path.isfile(filename):
                        arcname = os.path.join(os.path.relpath(root, src), fn)
                        zipf.write(filename, arcname)


@Command.registry.register
class RestoreCommand(Command):
    identity = 'restore'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            'source', type=str, metavar='path',
            help="Path (file or directory) to restore backup from")

    @classmethod
    def execute(cls, args, env):
        if is_zipfile(args.source):
            @contextmanager
            def src_context():
                with TemporaryDirectory() as tmpdir:
                    cls.decompress(args.source, tmpdir)
                    yield tmpdir
        else:
            @contextmanager
            def src_context():
                yield args.source

        with src_context() as src:
            restore(env, src)

    @classmethod
    def decompress(cls, src, dst):
        logger.debug("Decompressing '%s' to '%s'...", src, dst)
        with ZipFile(src, 'r') as zipf:
            zipf.extractall(dst)


@Command.registry.register
class SQLCommand(Command):
    identity = 'sql'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            'query', type=str, nargs='?', default='',
            help="SQL query to execute")

        parser.add_argument(
            '-f', '--file', type=str, action='append',
            help="SQL script from given file (can be used multiple times)")

        parser.add_argument(
            '-r', '--result', action='store_const', const=True, default=False,
            help="Print query result to stdout in CSV format")

    @classmethod
    def execute(cls, args, env):
        con = DBSession.connection()
        con.begin()

        def _execute(sql):
            return con.execute(sql)

        sql = args.query

        if sql == '':
            finput = fileinput.input(args.file if args.file is not None else ['-', ])

            for line in finput:
                if finput.isfirstline() and sql != '':
                    res = _execute(sql)
                    sql = ''
                sql = sql + '\n' + line

        elif args.file is not None:
            raise RuntimeError("Option -f or --file shouldn't be used with query argument")

        if sql != '':
            res = _execute(sql)

        if args.result:
            w = csv.writer(sys.stdout, encoding='utf-8')
            w.writerow(res.keys())
            for row in res.fetchall():
                w.writerow(row)

        con.execute('COMMIT')


@Command.registry.register
class MaintenanceCommand(Command):
    identity = 'maintenance'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            '--estimate-storage', dest='estimate_storage', action='store_true',
            help='Run storage.estimate after maintenance')

    @classmethod
    def execute(cls, args, env):
        for comp in env.chain('maintenance'):
            logger.debug("Maintenance for component: %s...", comp.identity)
            comp.maintenance()
        
        if args.estimate_storage:
            env.core.estimate_storage_all()


@Command.registry.register
class StorageEstimateCommand(Command):
    identity = 'storage.estimate'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        env.core.estimate_storage_all()


@Command.registry.register
class DumpConfigCommand(Command):
    identity = 'dump_config'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        def print_options(identity, options):
            sprint = False
            for k, v in options._options.items():
                if not sprint:
                    print('[{}]'.format(identity))
                    sprint = True
                print("{} = {}".format(k, v))

        print_options('environment', env.options)
        for comp in env.chain('initialize'):
            print_options(comp.identity, comp.options)


@Command.registry.register
class StatisticsCommand(Command):
    identity = 'statistics'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        result = dict()
        for comp in env._components.values():
            if hasattr(comp, 'query_stat'):
                result[comp.identity] = comp.query_stat()

        print(ensure_text(geojson.dumps(result, ensure_ascii=False, indent=2)))


@Command.registry.register
class MigrationStatusCommand(Command):
    identity = 'migration.status'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        reg = MigrationRegistry(env)
        cstate = reg.read_state()
        print("A |    | Migration                      | Message")
        for m in reg._all_migrations.values():
            print("{} | {}{} | {:30} | {}".format(
                '+' if m.key in cstate else ' ',
                'F' if m._has_forward else ' ',
                'R' if m._has_rewind else ' ',
                m.component + ':' + m.revision, m._message))


@Command.registry.register
class MigrationCreateCommand(Command):
    identity = 'migration.create'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('component', type=str)
        parser.add_argument('message', type=str)
        parser.add_argument('-f', '--format', type=str, default='sql', choices=('sql', 'python'))
        parser.add_argument('-m', '--merge', action='store_true', default=False)
        parser.add_argument('-p', '--parents', type=str, nargs='+', metavar='PARENT')
        parser.add_argument('-d', '--date', type=str, default=None)

    @classmethod
    def execute(cls, args, env):
        reg = MigrationRegistry(env)
        graph = reg.graph
        component = args.component

        if args.parents is None:
            heads = list(graph.select('head', component=component))
            if args.merge and len(heads) <= 1:
                raise RuntimeError("Nothing to merge!")
            elif args.merge and len(heads) > 2:
                raise RuntimeError("{} heads found, unable to merge!")
            elif len(heads) == 1 or (args.merge and len(heads) == 2):
                parents = [h.revision for h in heads]
            elif len(heads) == 0:
                parents = (REVID_ZERO, )
            else:
                raise RuntimeError("Use --parents option!")
        else:
            parents = args.parents

        date = datetime_fromisoformat(args.date) if args.date is not None else datetime.now()
        revision = revid(date)
        mcls = {'python': PythonModuleMigration, 'sql': SQLScriptMigration}[args.format]

        mpath = reg.migration_path(component)
        if not mpath.exists():
            logger.info("Creating directory {}".format(mpath))
            mpath.mkdir()

        outfiles = mcls.template(
            reg.migration_path(component), revision, parents=parents,
            date=date, message=args.message)

        # Use relative paths only if possible
        try:
            cwd = Path().resolve()
            outfiles = [p.resolve().relative_to(cwd) for p in outfiles]
        except ValueError:
            outfiles = [p.resolve() for p in outfiles]

        print("Migration [{}:{}] created:\n* ".format(
            component, revision) + '\n* '.join(map(str, outfiles)))


class MigrationApplyCommand(Command):
    identity = None
    subcmd = None
    subarg = None

    @classmethod
    def argparser_setup(cls, parser, env):
        if cls.subarg == 'component':
            parser.add_argument('component', nargs='+')
        elif cls.subarg == 'revision':
            parser.add_argument('revision')

        parser.add_argument('--no-dry-run', action='store_true')
        parser.add_argument('--no-execute', action='store_true')

    @classmethod
    def execute(cls, args, env):
        reg = MigrationRegistry(env)
        graph = reg.graph

        cstate = {r: False for r in graph._nodes}

        dry_run = not args.no_dry_run

        if hasattr(args, 'component'):
            components = args.component
        if hasattr(args, 'revision'):
            mkey = MigrationKey(*args.revision.split(':'))
            assert mkey in cstate

        destructive = False
        of_install, of_uninstall = False, False
        of_forward, of_rewind = False, False

        if cls.subcmd == 'init':
            tstate = {r: True for r in graph.select('head')}
            of_install = True

        elif cls.subcmd == 'install':
            cstate.update(reg.read_state())
            tstate = dict(cstate)
            for c in components:
                tstate.update({k: True for k in graph.select('head', component=c)})
            of_install = True

        elif cls.subcmd == 'uninstall':
            destructive = True
            cstate.update(reg.read_state())
            tstate = dict()
            for cid in components:
                tstate.update({k: False for k in graph.select('all', component=cid)})
            of_uninstall = True

        elif cls.subcmd == 'upgrade':
            cstate.update(reg.read_state())
            tstate = {r: True for r in graph.select('head')}
            of_install = True
            of_forward = True

        elif cls.subcmd == 'forward':
            cstate.update(reg.read_state())
            tstate = dict(cstate)
            tstate[mkey] = True
            of_forward = True

        elif cls.subcmd == 'rewind':
            destructive = True
            cstate.update(reg.read_state())
            tstate = dict(cstate)
            tstate[mkey] = False
            of_rewind = True

        operations = graph.operations(
            install=of_install, uninstall=of_uninstall,
            forward=of_forward, rewind=of_rewind)

        solution = resolve(operations, cstate, tstate)
        if solution is None:
            print("No migration solution found! Exitting!")
            exit(1)

        if not destructive:
            for op in solution:
                if isinstance(op, (UninstallOperation, RewindOperation)):
                    raise RuntimeError("Destructive operation protection!")

        if len(solution) == 0:
            print("There are no changes required. It's OK!")
            exit(0)

        elif dry_run:
            print("The following operations would be applied:\n")
            for idx, op in enumerate(solution, start=1):
                print("{:3d}. {}".format(idx, op))
            print("\nUse --no-dry-run option to actually run them.")
            exit(0)

        elif args.no_execute:
            state = dict(cstate)
            for op in solution:
                state = op.apply(state)
            with transaction.manager:
                reg.write_state(state)

        else:
            print("Executing the following migrations:\n")
            for idx, op in enumerate(solution, start=1):
                print("{:3d}. {}".format(idx, op))
            print("")

            ctx = MigrationContext(reg, env)
            ctx.execute_operations(solution, cstate)

            print("Migration operations completed!")


@Command.registry.register
class InitMigrationCommand(MigrationApplyCommand):
    identity = 'migration.init'
    subcmd = 'init'


@Command.registry.register
class InstallMigrationCommand(MigrationApplyCommand):
    identity = 'migration.install'
    subcmd = 'install'
    subarg = 'component'


@Command.registry.register
class UninstallMigrationCommand(MigrationApplyCommand):
    identity = 'migration.uninstall'
    subcmd = 'uninstall'
    subarg = 'component'


@Command.registry.register
class UpgradeMigrationCommand(MigrationApplyCommand):
    identity = 'migration.upgrade'
    subcmd = 'upgrade'


@Command.registry.register
class ForwardMigrationCommand(MigrationApplyCommand):
    identity = 'migration.forward'
    subcmd = 'forward'
    subarg = 'revision'


@Command.registry.register
class RewindMigrationCommand(MigrationApplyCommand):
    identity = 'migration.rewind'
    subcmd = 'rewind'
    subarg = 'revision'
