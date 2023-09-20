from functools import partial, update_wrapper
from inspect import Signature, signature
from types import MethodType
from typing import Any, Callable, Dict, Hashable, Optional, Sequence, Type

from .container import Argument, BoundArgument, Container

TFunc = Callable[..., Any]
TAutoProvide = Callable[[Hashable], bool]


def inject(
    auto_provide: Optional[Dict[Type[Container], TAutoProvide]] = None,
) -> Callable[[TFunc], TFunc]:
    def _auto_provide(annotation: Hashable) -> Optional[Argument]:
        if auto_provide is None:
            return None
        for k, v in auto_provide.items():
            if v(annotation):
                return Argument(k)
        return None

    def _inject(func: TFunc) -> TFunc:
        new_params = list()
        inj_params = list()
        sig = signature(func)
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
            elif auto := _auto_provide(anno):
                uarg = auto
                handle = True
            if not handle:
                new_params.append(p)
                continue

            inj_params.append(uarg.bind(name, anno))

        if len(inj_params) == 0:
            return func

        return inject_wrapper(func, inj_params, sig.replace(parameters=new_params))

    return _inject


class inject_wrapper:
    _inj_values: Dict[str, Any]
    _bound_args: Dict[str, BoundArgument]

    def __init__(
        self,
        func: TFunc,
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
        return self.func(*args, **inj_values, **kwargs)

    def __get__(self, instance: Any, owner: Any) -> MethodType:
        return MethodType(self, instance)

    def __repr__(self) -> str:
        arepr = ", ".join(repr(ba) for ba in self._bound_args.values())
        return f"inject_wrapper({self.func!r}, {arepr})"

    def _invalidate(self, name: str) -> None:
        assert name in self._inj_values, f"'{name}' wasn't set but invalidating"
        self._inj_values.pop(name)


class UnresolvedDependency(Exception):
    def __init__(self, cnt: Type[Container], barg: BoundArgument) -> None:
        super().__init__(f"unable to resolve {barg} in {cnt}")
