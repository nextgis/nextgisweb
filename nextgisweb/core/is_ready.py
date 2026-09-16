from collections.abc import Generator
from typing import Protocol

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

from nextgisweb.env import Component
from nextgisweb.env.hook import ComponentHook, ComponentHookProtocol

from .component import CoreComponent


class IsReadyProtocol(ComponentHookProtocol, Protocol):
    def __call__[C: Component](self, comp: C, /) -> Generator[str, None, None]: ...


is_ready_hook = ComponentHook[IsReadyProtocol]("is_ready_hook")


@is_ready_hook()
def is_ready(comp: CoreComponent) -> Generator[str, None, None]:
    while True:
        try:
            sa_url = comp._engine_url(error_on_pwfile=True)
            break
        except OSError as exc:
            yield "File [{}] is missing!".format(exc.filename)

    sa_engine = create_engine(
        sa_url,
        connect_args=dict(
            connect_timeout=int(comp.options["database.connect_timeout"].total_seconds())
        ),
    )

    while True:
        try:
            with sa_engine.connect():
                break
        except OperationalError as exc:
            yield str(exc.orig).rstrip()

    sa_engine.dispose()
