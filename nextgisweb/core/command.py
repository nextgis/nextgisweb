# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import os
import os.path
import logging
from os.path import join as pthjoin
from datetime import datetime
from tempfile import NamedTemporaryFile
from contextlib import contextmanager
from backports.tempfile import TemporaryDirectory
from zipfile import ZipFile, is_zipfile

import transaction

from .. import geojson
from ..command import Command
from ..models import DBSession

from .backup import backup, restore


logger = logging.getLogger(__name__)


@Command.registry.register
class InitializeDBCmd():
    identity = 'initialize_db'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            '--drop', action="store_true", default=False,
            help="Удалить существующие объекты из БД")

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

            # It's unclear why, but if transaction only
            # ran DDL operators, then it will not be saved
            # need to force with a cludge

            connection.execute("COMMIT")


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
                os.mkdir(target)
                yield target
        else:
            @contextmanager
            def tgt_context():
                with TemporaryDirectory() as tmpdir:
                    yield tmpdir
                    cls.compress(tmpdir, target)

        with tgt_context() as tgt:
            backup(env, tgt)

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
            help="Исходный файл или директория с резервной копией для"
            + " восстановления")  # NOQA: W503

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
class MaintenanceCommand(Command):
    identity = 'maintenance'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        for comp in env.chain('maintenance'):
            logger.debug("Maintenance for component: %s...", comp.identity)
            comp.maintenance()


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

        print(geojson.dumps(result, ensure_ascii=False, indent=2).encode('utf-8'))
