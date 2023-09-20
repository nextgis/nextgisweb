from functools import partial

from .cmd_grp import Command, Group


def _decorator(cls, *args, **kwargs):
    def _wrapper(cls_or_fn):
        return cls(cls_or_fn, *args, **kwargs)

    return _wrapper


group = partial(_decorator, Group)
command = partial(_decorator, Command)
