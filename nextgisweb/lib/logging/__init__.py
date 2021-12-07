from sys import _getframe
from logging import getLogger, Logger

__all__ = ['DO_NOT_USE_WILDCARD_IMPORT']

logger: Logger  # Annotation for type hints

logger_bootstrap = getLogger('nextgisweb.bootstrap')
logger_unknown = getLogger('nextgisweb.unknown')
logger_this = getLogger(__name__)


def __getattr__(attr):

    if attr == 'logger':
        frame = _getframe(1)

        if frame.f_code.co_filename == '<frozen importlib._bootstrap>':
            return logger_bootstrap

        name = frame.f_locals.get('__name__')
        if name is not None:
            return getLogger(name)
        else:
            logger_this.warning(
                "Logger 'nextgisweb.unknown' will be used for "
                "frame: %s", str(frame))
            return logger_unknown

    elif attr == 'DO_NOT_USE_WILDCARD_IMPORT':
        raise ImportError(
            f"Wildcard import blocked for {__name__}! Use: "
            "from {__name__} import logger")

    else:
        raise ImportError(f"Cannot import '{attr}' from '{__name__}'")
