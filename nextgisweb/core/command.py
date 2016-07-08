# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
from os.path import join as pthjoin
from datetime import datetime
import json
import transaction

from ..command import Command
from ..models import DBSession

from .backup import backup, restore


@Command.registry.register
class InitializeDBCmd():
    identity = 'initialize_db'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--drop', action="store_true", default=False,
            help=u"Удалить существующие объекты из БД")

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

            # Не очень понятно почему так, но если в транзакции
            # выполнялись только DDL операторы, то транзакция не
            # записывается, форсируем костылем

            connection.execute("COMMIT")


@Command.registry.register
class BackupCommand(Command):
    identity = 'backup'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            '--no-zip', dest='nozip', action='store_true',
            help=u"Не запаковывать резервную копию в ZIP-архив, резервная"
            + u" копия будет создана в виде директории")

        settings = env.core.settings
        if 'backup.path' in settings:
            default_target = pthjoin(
                settings['backup.path'],
                datetime.today().strftime(settings['backup.filename']) +
                '.ngwbackup')
        else:
            default_target = None

        parser.add_argument(
            'target', type=str, metavar='path', default=default_target,
            nargs='?' if default_target is not None else None,
            help=u"Имя файла или директории (см. --no-zip), в который будет"
            + u" сохранена резервная копия")

    @classmethod
    def execute(cls, args, env):
        backup(env, args.target, nozip=args.nozip)


@Command.registry.register
class RestoreCommand(Command):
    identity = 'restore'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            'source', type=str, metavar='path',
            help=u"Исходный файл или директория с резервной копией для"
            + u" восстановления")

    @classmethod
    def execute(cls, args, env):
        restore(env, args.source)


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

        print(json.dumps(result, ensure_ascii=False, indent=2).encode('utf-8'))
