from ..command import Command

from . import Resource


@Command.registry.register
class ResourceListCmd:
    identity = 'resource.list'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        for item in Resource.registry:
            if item.identity == 'resource':
                continue
            print(item.identity)
