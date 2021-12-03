import inspect
from logging import getLogger, Logger

__all__ = ['DO_NOT_USE_WILDCARD_IMPORT']

logger: Logger  # Annotation for type hints


def __getattr__(name):
    if name == 'logger':
        frm = inspect.stack()[1]
        mod = inspect.getmodule(frm[0])
        return getLogger(mod.__name__)

    elif name == 'DO_NOT_USE_WILDCARD_IMPORT':
        raise ImportError(
            f"Wildcard import blocked for {__name__}! Use: "
            "from {__name__} import logger")

    else:
        raise ImportError(
            f"Cannot import '{name}' from '{__name__}'")
