import os

from ..lib.i18n import trstr_factory

COMP_ID = 'file_upload'
_ = trstr_factory(COMP_ID)


def stat_dir(path):
    files = bytes_ = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for filename in filenames:
            files += 1
            bytes_ += os.stat(os.path.join(dirpath, filename)).st_size
    return files, bytes_
