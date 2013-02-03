# -*- coding: utf-8 -*-
from .registry import registry_maker


class Command(object):
    registry = registry_maker()


@Command.registry.register
class InitializeDBCmd():
    identity = 'initialize_db'

    @classmethod
    def argparser_setup(cls, parser):
        parser.add_argument('--drop', action="store_true", default=False,
            help=u"Удалить существующие объекты из БД")

    @classmethod
    def execute(cls, args, env):
        import transaction
        from .component import Component
        from .models import Base, DBSession

        with transaction.manager:

            if args.drop:
                Base.metadata.drop_all(DBSession.connection())

            Base.metadata.create_all(DBSession.connection())

            for comp in env.chain('initialize_db'):
                comp.initialize_db()
