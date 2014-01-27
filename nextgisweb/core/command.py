# -*- coding: utf-8 -*-
from ..command import Command
from .backup import backup, restore


@Command.registry.register
class BackupCommand(Command):
    identity = 'backup'

    @classmethod
    def argparser_setup(cls, parser):
        parser.add_argument(
            '--no-zip', dest='nozip', action='store_true',
            help=u"Не запаковывать резервную копию в ZIP-архив, резервная"
            + u" копия будет создана в виде директории")
        parser.add_argument(
            'target', type=str, metavar='path',
            help=u"Имя файла или директории (см. --no-zip), в который будет"
            + u" сохранена резервная копия")

    @classmethod
    def execute(cls, args, env):
        backup(env, args.target, nozip=args.nozip)


@Command.registry.register
class RestoreCommand(Command):
    identity = 'restore'

    @classmethod
    def argparser_setup(cls, parser):
        parser.add_argument(
            'source', type=str, metavar='path',
            help=u"Исходный файл или директория с резервной копией для"
            + u" восстановления")

    @classmethod
    def execute(cls, args, env):
        restore(env, args.source)
