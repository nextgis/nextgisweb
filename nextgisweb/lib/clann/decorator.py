from functools import partial
from typing import Callable

from .cmd_grp import Command, Group


def _decorator(cls, *args, **kwargs):
    def _wrapper(cls_or_fn):
        return cls(cls_or_fn, *args, **kwargs)

    return _wrapper


group: Callable[..., Callable[..., Group]] = partial(_decorator, Group)
command: Callable[..., Callable[..., Command]] = partial(_decorator, Command)
