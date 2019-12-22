# -*- coding: utf-8 -*-
from ..command import Command


@Command.registry.register
class CleanUpCommand():
    identity = 'file_upload.cleanup'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        env.file_upload.cleanup()
