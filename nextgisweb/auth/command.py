import logging

import transaction

from ..command import Command

from . import User


logger = logging.getLogger(__name__)


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


@Command.registry.register
class AuthenticateCommand():
    identity = 'authenticate'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            'keyname', type=str, metavar='user|group',
            help="User or group whose user will be authenticated")
        parser.add_argument(
            'url', type=str, metavar='url',
            help="Web GIS page")

    @classmethod
    def execute(cls, args, env):
        try:
            url = env.auth.session_invite(args.keyname, args.url)
        except ValueError as exc:
            logger.critical(exc)
            exit(1)

        print(url)
