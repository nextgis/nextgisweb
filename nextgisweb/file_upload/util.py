import os


def stat_dir(path: str) -> tuple[int, int]:
    files = nbytes = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for filename in filenames:
            full_filename = os.path.join(dirpath, filename)
            nbytes += os.stat(full_filename, follow_symlinks=False).st_size
            files += 1
    return files, nbytes
