from __future__ import annotations

from inspect import signature
from typing import Callable, Optional, Union

from docstring_parser import parse as docstring_parse

from .argparse import ArgumentParser as _ArgumentParser
from .param import Param

NS_CMD_GRP_ATTR = "_cmd_or_grp"
NS_PARSER_ATTR = "_parser"


class Command:
    def __init__(
        self,
        cmd_cls: type,
        *,
        parent: Optional[Command] = None,
        name: Optional[str] = None,
        short_desc: Optional[str] = None,
        long_desc: Optional[str] = None,
        decorator: Optional[Callable] = None,
    ):
        self.cmd_cls = cmd_cls
        self.parent = parent
        self.name = name if name else cmd_cls.__name__
        self.short_desc = short_desc
        self.long_desc = long_desc
        self.decorator = decorator

        pskip = list()
        tp = self.parent
        while tp is not None:
            pskip.extend(tp.params)
            tp = tp.parent

        self.params = params = list()
        for c in cmd_cls.mro():
            a = getattr(c, "__annotations__", {})
            for pname, annotation in a.items():
                p = getattr(c, pname, None)
                if (p is None) or (not isinstance(p, Param)) or (p in pskip) or (p in params):
                    continue
                params.append(p.bind(pname, annotation))

    def setup_parser(self, parser: ArgumentParser):
        parser.set_defaults(
            **{
                NS_CMD_GRP_ATTR: self,
                NS_PARSER_ATTR: parser,
            }
        )
        for p in self.params:
            p.setup_parser(parser)


class Group(Command):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.members = list()

    def command(self, *args, **kwargs) -> Callable[..., Command]:
        return self._decorator_factory(Command, *args, **kwargs)

    def group(self, *args, **kwargs) -> Callable[..., Group]:
        return self._decorator_factory(Group, *args, **kwargs)

    def setup_parser(self, parser: ArgumentParser):
        super().setup_parser(parser)
        subs = parser.add_subparsers(
            metavar="command",
            title="available subcommands",
            help=", ".join(sorted(m.name for m in self.members)),
        )
        for m in self.members:
            subp = subs.add_parser(name=m.name, description=m.short_desc, epilog=m.long_desc)
            m.setup_parser(subp)

    def _decorator_factory(self, member_cls, name=None, decorator=None):
        if decorator is None:
            decorator = self.decorator

        def _wrapper(cls_or_fn):
            nonlocal name
            name = name if name else cls_or_fn.__name__

            dstr = docstring_parse(getattr(cls_or_fn, "__doc__", ""))
            dstr_param = {p.arg_name: p.description for p in dstr.params}

            if isinstance(cls_or_fn, type):
                cmd_cls = cls_or_fn
                if decorator is not None:
                    cmd_cls = type(
                        cmd_cls.__name__,
                        (cmd_cls,),
                        {
                            "__call__": decorator(cmd_cls.__call__),
                        },
                    )
            else:
                if self.decorator is not None:
                    cls_or_fn = self.decorator(cls_or_fn)
                base_cls, params = _fn_signature(cls_or_fn, dstr_param)
                cmd_cls = type(
                    cls_or_fn.__name__,
                    (_FnWrapper, base_cls),
                    {
                        "__annotations__": {k: v for k, v, _ in params},
                        **{k: v for k, _, v in params},
                    },
                )
                cmd_cls._defn = (cls_or_fn, [pn for pn, _, _ in params])

            member = member_cls(
                cmd_cls,
                parent=self,
                name=name,
                short_desc=dstr.short_description,
                long_desc=dstr.long_description,
                decorator=decorator,
            )
            self.members.append(member)
            return member

        return _wrapper


class ArgumentParser(_ArgumentParser):
    def __init__(
        self,
        cmd_or_grp: Union[Group, Command, None] = None,
        *args,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        if cmd_or_grp:
            cmd_or_grp.setup_parser(self)

    def execute(self, namespace):
        obj = getattr(namespace, NS_CMD_GRP_ATTR).cmd_cls()
        parser = getattr(namespace, NS_PARSER_ATTR)

        for k, v in namespace.__dict__.items():
            if k not in (NS_CMD_GRP_ATTR, NS_PARSER_ATTR):
                setattr(obj, k, v)

        if not hasattr(obj, "__call__"):
            parser.print_help()
            parser.exit()
        elif hasattr(obj, "__enter__"):
            assert hasattr(obj, "__exit__")
            with obj:
                obj()
        else:
            obj()


def _fn_signature(fn, pdoc):
    base_cls = None
    params = list()

    for pn, p in signature(fn).parameters.items():
        if p.annotation is p.empty:
            raise TypeError(f"annotation required: {pn}")

        if base_cls is None:
            if p.default is not p.empty or p.kind not in (
                p.POSITIONAL_ONLY,
                p.POSITIONAL_OR_KEYWORD,
            ):
                raise TypeError(f"invalid parameter: {pn}")
            base_cls = p.annotation
        else:
            if not isinstance(p.default, Param):
                raise TypeError(f"invalid parameter: {pn}")

            params.append((pn, p.annotation, p.default))
            p.default.doc = pdoc.get(pn, p.default.doc)

    if base_cls is None:
        raise TypeError("at least one argument required")

    return base_cls, params


class _FnWrapper:
    def __call__(self):
        fn, args = self._defn
        fn(self, **{k: getattr(self, k) for k in args})
