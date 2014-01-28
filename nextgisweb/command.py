# -*- coding: utf-8 -*-
import transaction

from .registry import registry_maker


class Command(object):
    registry = registry_maker()


@Command.registry.register
class InitializeDBCmd():
    identity = 'initialize_db'

    @classmethod
    def argparser_setup(cls, parser):
        parser.add_argument(
            '--drop', action="store_true", default=False,
            help=u"Удалить существующие объекты из БД")

    @classmethod
    def execute(cls, args, env):
        from .models import DBSession

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
