from os.path import abspath, split, splitext
from sys import _getframe
from inspect import getmodule
from logging import getLogger, Logger

__all__ = ['DO_NOT_USE_WILDCARD_IMPORT']

logger: Logger  # Annotation for type hints

_dirmod_cache = dict()


def __getattr__(attr):

    if attr == 'logger':
        frame = _getframe(1)

        # Call of inspect.getmodule(object) is expensive, thus we use
        # directory-based cache: files located in the same directory have
        # the same module name prefix.

        fullname = abspath(frame.f_code.co_filename)
        dirname, filename = split(fullname)

        dirpkg = _dirmod_cache.get(dirname)
        if dirpkg is not None:
            name = dirpkg + '.' + splitext(filename)[0]

        else:
            mod = getmodule(frame)
            name = mod.__name__
            _dirmod_cache[dirname] = name if filename.startswith('__init__.') \
                else '.'.join(name.split('.')[:-1])

        return getLogger(name)

    elif attr == 'DO_NOT_USE_WILDCARD_IMPORT':
        raise ImportError(
            f"Wildcard import blocked for {__name__}! Use: "
            "from {__name__} import logger")

    else:
        raise ImportError(f"Cannot import '{attr}' from '{__name__}'")
