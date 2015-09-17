# -*- coding: utf-8 -*-
from os import walk, stat, remove, rmdir, listdir
from os.path import join as ptjoin
from datetime import timedelta, datetime

from ..command import Command


@Command.registry.register
class CleanUpCommand():
    identity = 'file_upload.cleanup'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        path = env.file_upload.path

        deleted_files = 0
        deleted_dirs = 0
        deleted_bytes = 0

        kept_files = 0
        kept_dirs = 0
        kept_bytes = 0

        cutstamp = datetime.now() - timedelta(days=3)

        for (dirpath, dirnames, filenames) in walk(path, topdown=False):
            relist = False

            for fn in filenames:
                if not fn.endswith('.meta'):
                    continue

                metaname = ptjoin(dirpath, fn)
                dataname = metaname[:-5] + '.data'
                metastat = stat(metaname)
                datastat = stat(dataname)
                metatime = datetime.fromtimestamp(metastat.st_mtime)
                datatime = datetime.fromtimestamp(datastat.st_mtime)

                if (metatime < cutstamp) and (datatime < cutstamp):
                    remove(metaname)
                    remove(dataname)
                    relist = True
                    deleted_files += 2
                    deleted_bytes += metastat.st_size + datastat.st_size
                else:
                    kept_files += 2
                    kept_bytes += metastat.st_size + datastat.st_size

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
