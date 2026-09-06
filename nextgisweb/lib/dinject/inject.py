from __future__ import annotations

from collections.abc import Callable, Hashable, Sequence
from dataclasses import dataclass
from functools import partial, update_wrapper
from inspect import Signature, formatannotationrelativeto, ismethod, signature, unwrap
from types import FunctionType, MethodType
from typing import Any
from warnings import warn_explicit

from .container import Container, KeyType


class Injector[C: Container]:
    def __init__(
        self,
        container: type[C],
        *,
        auto_provide: Callable[[Hashable], bool] | None = None,
    ) -> None:
        self._container = container
        self._auto_provide = auto_provide

    def __call__[F: Callable](self) -> Callable[[F], F]:
        return self._wrap

    def arg(self) -> Any:
        return Argument(self._container)

    def _auto_provide_for(self, tdef: Hashable, /) -> Argument | None:
        if (v := self._auto_provide) is not None and v(tdef):
            return Argument(self._container)
        return None

    def _wrap[T: Callable](self, func: T) -> T:
        new_params = list()
        inj_params = list()
        sig = signature(func, eval_str=True)
        for name, p in sig.parameters.items():
            if p.kind != p.KEYWORD_ONLY:
                # Bypass non keyword only
                new_params.append(p)
                continue

            uarg = p.default
            anno = p.annotation

            handle = False
            if isinstance(uarg, Argument):
                handle = True
            elif auto := self._auto_provide_for(anno):
                self._warn_func(
                    "Auto-providing argument in function `{func_name}` which is deprecated since "
                    "nextgisweb 5.6.0.dev5 and will be removed in a future version. Dependencies "
                    "should be marked explicitly using `Injector.arg()`.",
                    func=func,
                    category=DeprecationWarning,
                )
                uarg = auto
                handle = True
            if not handle:
                new_params.append(p)
                continue

            inj_params.append(uarg.bind(name, anno))

        if len(inj_params) == 0:
            return func

        return inject_wrapper(func, inj_params, sig.replace(parameters=new_params))  # ty: ignore[invalid-return-type]

    def _warn_func(self, message: str, *, func: Callable, category: type[Warning]) -> None:
        if ismethod(func):
            func = func.__func__

        func = unwrap(func)
        assert isinstance(func, FunctionType)

        warn_explicit(
            message.format(func_name=func.__name__),
            category=category,
            filename=func.__code__.co_filename,
            lineno=func.__code__.co_firstlineno,
            module=func.__module__,
        )


@dataclass(slots=True, frozen=True)
class Argument[C: Container]:
    cnt: type[C]
    selector: KeyType = ()

    def bind(self, name: str, tdef: Hashable) -> BoundArgument[C]:
        return BoundArgument(self.cnt, name, (tdef,) + self.selector)


@dataclass(slots=True, frozen=True)
class BoundArgument[C: Container]:
    cnt: type[C]
    name: str
    key: KeyType

    def __repr__(self) -> str:
        trepr = formatannotationrelativeto(self.key[0])(self.key[0])
        return f"{self.name}: {trepr}"


class inject_wrapper:
    _inj_values: dict[str, Any]
    _bound_args: dict[str, BoundArgument]

    def __init__(
        self,
        func: Callable,
        iargs: Sequence[BoundArgument],
        signature: Signature,
    ) -> None:
        self.func = func
        update_wrapper(self, func)
        self.__signature__ = signature

        self._inj_values = dict()
        self._bound_args = {arg.name: arg for arg in iargs}

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        inj_values = self._inj_values
        bound_args = self._bound_args

        if len(inj_values) < len(bound_args):
            for name, barg in bound_args.items():
                if name not in inj_values:
                    try:
                        inj_values[name] = barg.cnt._from_container(
                            barg.key, partial(self._invalidate, name)
                        )
                    except KeyError:
                        raise UnresolvedDependency(barg.cnt, barg)

        assert len(inj_values) == len(bound_args)
        return self.func(*args, **{**inj_values, **kwargs})

    def __get__(self, instance: Any, owner: Any) -> MethodType:
        return MethodType(self, instance)

    def __repr__(self) -> str:
        arepr = ", ".join(repr(ba) for ba in self._bound_args.values())
        return f"inject_wrapper({self.func!r}, {arepr})"

    def _invalidate(self, name: str) -> None:
        assert name in self._inj_values, f"'{name}' wasn't set but invalidating"
        self._inj_values.pop(name)


class UnresolvedDependency(Exception):
    def __init__(self, cnt: type[Container], barg: BoundArgument) -> None:
        super().__init__(f"unable to resolve {barg} in {cnt}")
