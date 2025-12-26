from __future__ import annotations

import re
from collections.abc import Sequence
from datetime import datetime, time
from importlib.metadata._itertools import unique_everseen
from itertools import count
from textwrap import indent
from types import UnionType
from typing import TYPE_CHECKING, Any, Literal, Type, TypeVar, Union, cast, get_args, get_origin

from msgspec import UNSET, Struct, UnsetType, field
from typing_extensions import Protocol

from nextgisweb.env.package import pkginfo
from nextgisweb.lib.apitype import disannotate, unannotate
from nextgisweb.lib.apitype.util import (
    NoneType,
    decompose_union,
    get_class_annotations,
    is_enum_type,
    is_struct_type,
)
from nextgisweb.lib.imptool import module_from_stack
from nextgisweb.lib.json import dumps

from .util import indented

ModuleName = str
TypeName = str
Export = tuple[ModuleName, TypeName]

# Placeholder for a field is defined in __post_init__
POST_INIT = cast(Any, UNSET)


class TSGenerator:
    modules: dict[str, TSModule]
    types: dict[Any, TSType]

    def __init__(self):
        self.counter = count(0)
        self.types = dict()
        self.modules = dict()

    def module(self, name: ModuleName) -> TSModule:
        if (module := self.modules.get(name)) is None:
            module = TSModule(generator=self, name=name)
            self.modules[name] = module
        return module

    def add(self, tdef: Any, *, export: Export | None = None) -> TSType:
        otype, annotations = disannotate(tdef, supertype=True)
        if (result := self.types.get(otype)) is None:
            result = self.translate(otype)
            if (
                export is None
                and result.auto_export
                and (name := getattr(otype, "__name__", None))
                and (module := getattr(otype, "__module__", None))
            ):
                cid = pkginfo.component_by_module(module)
                if not name.startswith("_") and cid:
                    result.add_export((component_tsmodule(cid), name))

        for ann in annotations:
            if isinstance(ann, TSExport):
                result.add_export((ann.module, ann.name_for(otype)))

        if export is not None:
            result.add_export(export)

        return result

    def translate(self, otype: Any) -> TSType:
        defaults: Any = dict(generator=self, type=otype)
        if supertype := getattr(otype, "__supertype__", None):
            otype = supertype

        if otype is UnsetType:
            result = TSPrimitive(keyword="never", **defaults)
        elif otype is NoneType:
            result = TSPrimitive(keyword="null", **defaults)
        elif otype is Any:
            result = TSPrimitive(keyword="any", **defaults)
        elif otype in (int, float):
            result = TSPrimitive(keyword="number", comment=otype.__name__, **defaults)
        elif otype is bool:
            result = TSPrimitive(keyword="boolean", **defaults)
        elif otype is str:
            result = TSPrimitive(keyword="string", **defaults)
        elif otype is dict:
            # For dicts without args use Record<string, any>
            result = TSMapping(args=(str, Any), **defaults)
        elif otype in (bytes, datetime, time):
            result = TSPrimitive(keyword="string", comment=otype.__name__, **defaults)
        elif is_enum_type(otype):
            result = TSEnum(args=[m.value for m in otype], **defaults)
        elif is_struct_type(otype):
            result = TSStruct(cls=otype, **defaults)
        else:
            origin = get_origin(otype)
            if origin in (UnionType, Union):
                result = TSUnion(args=get_args(otype), **defaults)
            elif origin in (list, set):
                comment = None if origin is list else origin.__name__
                result = TSList(arg=get_args(otype)[0], comment=comment, **defaults)
            elif origin is tuple:
                result = TSTuple(args=get_args(otype), **defaults)
            elif origin is dict:
                result = TSMapping(args=get_args(otype), **defaults)
            elif origin is Literal:
                result = TSEnum(args=get_args(otype), **defaults)
            else:
                result = TSPrimitive(keyword="unknown", comment=str(otype), **defaults)
        return result

    def register(self, ts: TSType):
        self.types[ts.type] = ts

    def compile(self) -> Sequence[TSModuleCompiled]:
        return tuple(m.compile() for m in self.modules.values())


class TSModule(Struct, kw_only=True, dict=True):
    generator: TSGenerator
    name: ModuleName

    if TYPE_CHECKING:
        unique: int = POST_INIT
        ns: str = POST_INIT

    imports: set[TSModule] = field(default_factory=set)
    declared: list[TSType] = field(default_factory=list)
    exported: list[tuple[TSType, TypeName]] = field(default_factory=list)
    code: str | None = None

    def __post_init__(self):
        self.unique = next(self.generator.counter)
        ns = self.name.lower()
        ns = re.sub(r"^@nextgisweb/", "", ns)
        ns = re.sub(r"^([^/]+)/type/api$", r"\1", ns)
        ns = re.sub(r"[^\w\d]+", "_", ns)
        ns = re.sub(r"_{2,}", "_", ns)
        assert re.fullmatch(r"\w[\w\d]*", ns)
        self.ns = f"_{ns}"

    def __hash__(self) -> int:
        return hash((id(self.generator), self.unique))

    def compile(self) -> TSModuleCompiled:
        declarations = ["export {};"]
        declarations.extend(f"export type {t.name} = {t.inline(self)};" for t in self.declared)

        exports = list()
        for t, name in self.exported:
            if name == "default":
                exports.append(f"export default {t.reference(self)};")
            else:
                exports.append(f"export type {name} = {t.reference(self)};")

        imports = sorted(f'import type * as {m.ns} from "{m.name}";' for m in self.imports)

        lines = list()
        for a in (imports, declarations, exports):
            if len(a) > 0:
                lines.extend(([""] if (lines and lines[-1] != "") else []) + a)

        self.code = f'declare module "{self.name}" {{\n{indented(lines)}\n}}\n'
        return cast(TSModuleCompiled, self)


class TSModuleCompiled(Protocol):
    name: ModuleName
    code: str


class TSType(Struct, kw_only=True, dict=True):
    generator: TSGenerator
    type: Any

    module: TSModule | None = None
    name: TypeName | None = None
    comment: str | None = None

    auto_export: bool = False

    if TYPE_CHECKING:
        unique: int = POST_INIT

    def __post_init__(self):
        self.unique = next(self.generator.counter)
        self.generator.register(self)
        self.__tstype_init__()

    def __tstype_init__(self):
        pass

    def __hash__(self) -> int:
        return hash((id(self.generator), self.unique))

    def add_export(self, value: tuple[ModuleName, TypeName]):
        module = self.generator.module(value[0])
        if self.module is None:
            self.module, self.name = module, value[1]
            module.declared.append(self)
        elif value != (self.module.name, self.name):
            module.exported.append((self, value[1]))

    def render(self, module: TSModule) -> str:
        if self.module is None or isinstance(self, TSPrimitive):
            result = self.inline(module) + (f" /* {rem} */" if (rem := self.comment) else "")
        else:
            result = self.reference(module)
        return result

    def inline(self, module: TSModule) -> str:
        raise NotImplementedError

    def reference(self, module: TSModule) -> str:
        assert self.module is not None and self.name is not None
        if module == self.module:
            return self.name
        else:
            module.imports.add(self.module)
            return f"{self.module.ns}.{self.name}"


class TSPrimitive(TSType, kw_only=True):
    keyword: str = "unknown"

    def inline(self, module: TSModule) -> str:
        return self.keyword


class TSUnion(TSType, kw_only=True):
    args: Sequence[Any]

    if TYPE_CHECKING:
        items: tuple[TSType, ...] = POST_INIT
        undefided_excluded: TSType | None = POST_INIT

    def __tstype_init__(self):
        super().__tstype_init__()
        self.items = tuple(self.generator.add(i) for i in unique_everseen(self.args))
        args_defined = tuple(a for a in self.args if (unannotate(a) is not UnsetType))
        if len(self.args) != len(args_defined):
            if len(args_defined) > 1:
                dtype = Union[args_defined]  # type: ignore
                self.undefided_excluded = TSUnion(
                    args=args_defined,
                    type=dtype,
                    generator=self.generator,
                )
            else:
                for itm in self.items:
                    if itm.type is not UnsetType:
                        self.undefided_excluded = itm
                        break
                assert self.undefided_excluded is not UNSET
        else:
            self.undefided_excluded = None

    def inline(self, module: TSModule) -> str:
        return " | ".join(ts.render(module) for ts in self.items)


class TSEnum(TSType, kw_only=True):
    args: Sequence[str | int | bool]
    auto_export = True

    def inline(self, module) -> str:
        return "({})".format(" | ".join(dumps(a) for a in self.args))


class TSList(TSType, kw_only=True):
    arg: Any

    if TYPE_CHECKING:
        item: TSType = POST_INIT

    def __tstype_init__(self):
        super().__tstype_init__()
        self.item = self.generator.add(self.arg)

    def inline(self, module: TSModule) -> str:
        return "({})[]".format(self.item.render(module))


class TSTuple(TSType, kw_only=True):
    args: tuple[Any, ...]

    if TYPE_CHECKING:
        items: tuple[TSType, ...] = POST_INIT

    def __tstype_init__(self):
        super().__tstype_init__()
        self.items = tuple(self.generator.add(a) for a in self.args)

    def inline(self, module: TSModule) -> str:
        parts = [i.render(module) for i in self.items]
        return f"[{', '.join(parts)}]"


class TSStructField(Struct):
    name: str
    tstype: TSType
    undefined: bool


IDENT_RE = re.compile(r"[_a-z][_a-z0-9]*", re.IGNORECASE)
KEYWORDS = frozenset(
    # https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#reserved_words
    "await,break,case,catch,class,const,continue,debugger,default,delete,do,"
    "else,enum,export,extends,false,finally,for,function,if,implements,import,"
    "in,instanceof,interface,let,new,null,package,private,protected,public,"
    "return,static,super,switch,this,throw,true,try,typeof,var,void,while,"
    "with,yield".split(",")
)


class TSStruct(TSType, kw_only=True):
    cls: Type[Struct]
    auto_export = True

    if TYPE_CHECKING:
        fields: tuple[TSStructField, ...] = POST_INIT
        tag: tuple[str, str | int] | None = POST_INIT
        array_like: bool = POST_INIT

    def __tstype_init__(self):
        super().__tstype_init__()
        fields: list[TSStructField] = list()
        for k, v in struct_fields_encoded(self.cls):
            if all(((unannotate(s) is UnsetType) for s in decompose_union(v))):
                continue

            ts, undefined = self.generator.add(v), False
            if isinstance(ts, TSUnion) and (ts_undefined := ts.undefided_excluded) is not None:
                ts, undefined = ts_undefined, True

            fields.append(TSStructField(k, ts, undefined))
        self.fields = tuple(fields)

        cfg = self.cls.__struct_config__
        self.array_like = cfg.array_like
        if cfg.tag is not None:
            assert cfg.tag_field is not None
            self.tag = (cfg.tag_field, cfg.tag)
        else:
            self.tag = None

    def inline(self, module: TSModule) -> str:
        if len(self.fields) == 0:
            return "[]" if self.array_like else "Record<string, never>"
        quote = any((not IDENT_RE.fullmatch(f.name) or f.name in KEYWORDS) for f in self.fields)
        quote = (lambda v: dumps(v)) if quote else (lambda v: v)
        parts = [f"{quote(self.tag[0])}: {dumps(self.tag[1])}"] if self.tag else []
        for fld in self.fields:
            name = quote(fld.name) + ("?" if fld.undefined else "")
            parts.append(f"{name}: {fld.tstype.render(module)}")
        multiline = len(parts) > 1
        sep = ("," if self.array_like else ";") + ("\n" if multiline else " ")
        tail = sep[0] if multiline else ""
        code = sep.join(parts) + tail
        if multiline:
            code = indent(code, "    ")
        brackets = "[]" if self.array_like else "{}"
        code = ("\n" if multiline else "") + code + ("\n" if multiline else "")
        code = brackets[0] + code + brackets[1]
        return code


class TSMapping(TSType, kw_only=True):
    args: tuple[Any, Any]

    if TYPE_CHECKING:
        ktype: TSType = POST_INIT
        vtype: TSType = POST_INIT

    def __tstype_init__(self):
        super().__tstype_init__()
        self.ktype, self.vtype = [self.generator.add(a) for a in self.args]

    def inline(self, module: TSModule) -> str:
        return f"Record<{self.ktype.render(module)}, {self.vtype.render(module)}>"


T = TypeVar("T")


class TSExport:
    name: str | None
    module: str

    def __init__(
        self,
        name: str | None = None,
        *,
        component: str | None = None,
        module: str = "type/api",
        depth: int = 0,
    ):
        self.name = name
        if not module.startswith("@"):
            if component is None:
                mod = module_from_stack(depth, (__name__,))
                component = pkginfo.component_by_module(mod)
                if component is None:
                    raise TypeError(f"no component found for module: {mod}")
            module = component_tsmodule(component, module)
        self.module = module

    def __hash__(self):
        return hash((self.module, self.name))

    def name_for(self, tdef: Any) -> str:
        if (name := self.name) is not None:
            return name
        if (name := getattr(tdef, "__name__", None)) is not None:
            return name
        raise TypeError(f"Unable to determine name for {tdef}")


def component_tsmodule(component: str, module: str = "type/api") -> str:
    parts = ("@nextgisweb", component.replace("_", "-"), module)
    return "/".join(parts)


def struct_fields_encoded(otype) -> tuple[tuple[str, Any], ...]:
    hints = get_class_annotations(otype)
    return tuple(
        (en, hints[fn])
        for fn, en in zip(
            otype.__struct_fields__,
            otype.__struct_encode_fields__,
        )
    )
