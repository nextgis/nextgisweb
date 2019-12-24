# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
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
