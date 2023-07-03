import os


def stat_dir(path):
    files = bytes_ = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for filename in filenames:
            files += 1
            bytes_ += os.stat(os.path.join(dirpath, filename)).st_size
    return files, bytes_
