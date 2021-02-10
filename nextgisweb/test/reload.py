import sys


def get_reload():
    if sys.version_info[0:2] < (3, 0):
        return lambda m: reload(m)
    if (3, 3) >= sys.version_info[0:2] >= (3, 0):
        import imp
        return lambda m: imp.reload(m)
    if sys.version_info[0:2] >= (3, 4):
        import importlib
        return lambda m: importlib.reload(m)


reload_module = get_reload()
