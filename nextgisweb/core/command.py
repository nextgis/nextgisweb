# -*- coding: utf-8 -*-
from os.path import join as pthjoin
from datetime import datetime

from ..command import Command
from .backup import backup, restore


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
