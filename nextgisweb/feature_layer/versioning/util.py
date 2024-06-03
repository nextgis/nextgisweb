from .exception import VersioningContextRequired


def _fversioning_guard(res):
    if (fversioning := res.fversioning) and not fversioning.vobj:
        raise VersioningContextRequired


def fversioning_guard(func):
    def wrapped(*args, **kwargs):
        _fversioning_guard(args[0])
        return func(*args, **kwargs)

    return wrapped
