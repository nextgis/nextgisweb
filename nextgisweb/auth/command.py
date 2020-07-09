# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

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
            help="The user whose password needs to be changed")

        parser.add_argument(
            'password', type=str, metavar='password',
            help="User's new password")

        # FIXME: Set new user password via command line
        # is potentially not secure, need to read from console or file.

    @classmethod
    def execute(cls, args, env):
        with transaction.manager:
            user = User.filter_by(keyname=args.keyname).one()
            user.password = args.password
