# -*- coding: utf-8 -*-
from os import walk, stat, remove, rmdir, listdir
from os.path import join as ptjoin
from ..command import Command

from .models import FileObj


@Command.registry.register
class CleanUpCommand():
    identity = 'file_storage.cleanup'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        path = env.file_storage.settings['path']

        deleted_files = 0
        deleted_dirs = 0
        deleted_bytes = 0

        kept_files = 0
        kept_dirs = 0
        kept_bytes = 0

        for (dirpath, dirnames, filenames) in walk(path, topdown=False):
            relist = False

            for fn in filenames:
                obj = FileObj.filter_by(uuid=fn).first()
                fullfn = ptjoin(dirpath, fn)
                size = stat(fullfn).st_size

                if obj is None:
                    remove(fullfn)
                    relist = True
                    deleted_files += 1
                    deleted_bytes += size
                else:
                    kept_files += 1
                    kept_bytes += size

            if (
                (not relist and len(filenames) == 0 and len(dirnames) == 0)
                or listdir(dirpath) == 0
            ):
                rmdir(dirpath)
                deleted_dirs += 1
            else:
                kept_dirs += 1

        print "Deleted | %6d files | %6d directories | %12d bytes |" % (
            deleted_files, deleted_dirs, deleted_bytes)
        print "Kept    | %6d files | %6d directories | %12d bytes |" % (
            kept_files, kept_dirs, kept_bytes)
