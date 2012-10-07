from .registry import registry_maker


class Command(object):
    registry = registry_maker()


@Command.registry.register
class InitializeDBCmd():
    identity = 'initialize_db'

    @classmethod
    def agrparser_setup(cls, argparser):
        pass

    @classmethod
    def execute(cls, args):
        import transaction
        from .component import Component
        from .models import Base, DBSession

        with transaction.manager:
            Base.metadata.drop_all(DBSession.connection())
            Base.metadata.create_all(DBSession.connection())

            for impl in Component.registry:
                if hasattr(impl, 'initialize_db'):
                    impl.initialize_db(DBSession)
