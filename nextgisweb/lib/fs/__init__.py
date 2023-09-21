import re

reserved = re.compile(r'^(aux|con[1-9]|lpt[1-9]|con|nul|prn)$')


def filename_strip(name):
    name = name.rstrip('. ')
    name = re.sub(r'[\\/:*?"<>|]', '', name)
    if reserved.match(name):
        return name + '_'
    return name[:255]
