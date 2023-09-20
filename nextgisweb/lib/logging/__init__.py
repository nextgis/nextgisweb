from functools import partial
from logging import Logger, getLogger
from sys import _getframe

__all__ = ["DO_NOT_USE_WILDCARD_IMPORT"]

logger: Logger  # Annotation for type hints

logger_bootstrap = getLogger("nextgisweb.bootstrap")
logger_unknown = getLogger("nextgisweb.unknown")
logger_this = getLogger(__name__)


def __getattr__(attr):
    if attr == "logger":
        frame = _getframe(1)

        if frame.f_code.co_filename == "<frozen importlib._bootstrap>":
            return logger_bootstrap

        name = frame.f_locals.get("__name__")
        if name is not None:
            return getLogger(name)
        else:
            logger_this.warning(
                "Logger 'nextgisweb.unknown' will be used for frame: %s", str(frame)
            )
            return logger_unknown

    elif attr == "DO_NOT_USE_WILDCARD_IMPORT":
        raise ImportError(
            f"Wildcard import blocked for {__name__}! Use: from {__name__} import logger"
        )

    else:
        raise ImportError(f"Cannot import '{attr}' from '{__name__}'")


class LazyStr:
    __slots__ = ("_value", "_fn")

    def __init__(self, value, func):
        self._value = value
        self._fn = func

    def __str__(self):
        return self._fn(self._value)


def lazy_str(func):
    return partial(LazyStr, func=func)
