# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import transaction

from ..command import Command
from .models import User


@Command.registry.register
class ChangePasswordCommand():
    identity = 'change_password'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            'keyname', type=str, metavar='user',
            help="Имя пользователя для изменения пароля")

        parser.add_argument(
            'password', type=str, metavar='password',
            help="Новый пароль пользователя")

        # FIXME: Указание нового пароля пользователя в командной строке
        # потенциально не безопасно, нужно читать с консоли или из файла.

    @classmethod
    def execute(cls, args, env):
        with transaction.manager:
            user = User.filter_by(keyname=args.keyname).one()
            user.password = args.password
