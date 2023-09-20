import re


def filename_strip(name):
    return re.sub(r'[\\/:*?"<>|]', '', name)[:255]
