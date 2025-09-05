from __future__ import annotations

from functools import partial
from sys import _getframe
from typing import Any, Mapping, Protocol, Sequence, Tuple, Union
from warnings import warn_explicit

from ..logging import logger


class Translatable(Protocol):
    def __translate__(self, translator: Translator) -> str: ...


class Translator(Protocol):
    def translate(
        self,
        msg: str,
        *,
        plural: Union[str, None] = None,
        number: Union[int, None] = None,
        context: Union[str, None] = None,
        domain: str,
    ) -> str: ...


TranslatableOrStr = Union[Translatable, str]
ModScalar = Union[int, float, TranslatableOrStr]
ModArgument = Union[ModScalar, Tuple[ModScalar], Mapping[str, ModScalar]]


class TrStr(Translatable):
    __slots__ = ["msg", "plural", "number", "context", "domain"]

    def __init__(
        self,
        msg: str,
        *,
        plural: Union[str, None] = None,
        number: Union[int, None] = None,
        context: Union[str, None] = None,
        domain: str,
        stacklevel: int = 1,
    ):
        self.msg = msg
        self.plural = plural
        self.number = number

        self.context = context
        self.domain = domain

        # Remeber where it is declared for future warning
        # TODO: Remove when warnings removed
        frame = _getframe(stacklevel)
        self._filename = frame.f_code.co_filename
        self._lineno = frame.f_lineno

    def __str__(self) -> str:
        if self.number is None or self.number == 1:
            return self.msg

        assert self.plural is not None
        return self.plural

    def __mod__(self, arg: ModArgument):
        # TODO: Warn and deprecated here
        return TrStrModFormat(self, arg)

    def __add__(self, other: TranslatableOrStr):
        return TrStrConcat(self, other)

    def __radd__(self, other: TranslatableOrStr):
        return TrStrConcat(other, self)

    def format(self, *args, **kwargs):
        warn_explicit(
            "Usage of TrStr.format() has been deprecated, migrate to gettextf "
            "functions (available since nextgisweb >= 4.9.0.dev7).",
            DeprecationWarning,
            filename=self._filename,
            lineno=self._lineno,
        )
        return TrStrFormat(self, args, kwargs)

    def __translate__(self, translator):
        return translator.translate(
            self.msg,
            plural=self.plural,
            number=self.number,
            context=self.context,
            domain=self.domain,
        )


class TrStrConcat(Translatable):
    def __init__(self, a: TranslatableOrStr, b: TranslatableOrStr):
        aitems = a.items if isinstance(a, TrStrConcat) else (a,)
        bitems = b.items if isinstance(b, TrStrConcat) else (b,)
        self.items: Tuple[TranslatableOrStr, ...] = (aitems) + (bitems)

    def __str__(self) -> str:
        return "".join(str(i) for i in deep_cast_to_str(self.items))

    def __add__(self, other: TranslatableOrStr):
        return TrStrConcat(self, other)

    def __radd__(self, other: TranslatableOrStr):
        return TrStrConcat(other, self)

    def __translate__(self, translator):
        return "".join(str(i) for i in deep_translate(self.items, translator))


class TrTpl(Translatable):
    __slots__ = ["msg", "plural", "number", "context", "domain"]

    def __init__(
        self,
        msg: str,
        *,
        plural: Union[str, None] = None,
        number: Union[int, None] = None,
        context: Union[str, None] = None,
        domain: str,
    ):
        self.msg = msg
        self.plural = plural
        self.number = number

        self.context = context
        self.domain = domain

    def __str__(self) -> str:
        return self.msg

    def __call__(self, *args, **kwargs):
        return TrStrFormat(self, args, kwargs)

    def format(self, *args, **kwargs):
        return self(*args, **kwargs)

    def __translate__(self, translator):
        return translator.translate(
            self.msg,
            plural=self.plural,
            number=self.number,
            context=self.context,
            domain=self.domain,
        )


class TrStrModFormat(Translatable):
    def __init__(self, trstr: Translatable, arg: ModArgument):
        self.trstr = trstr
        self.arg = arg

    def __str__(self) -> str:
        return str(self.trstr) % deep_cast_to_str(self.arg)

    def __add__(self, other: TranslatableOrStr):
        return TrStrConcat(self, other)

    def __radd__(self, other: TranslatableOrStr):
        return TrStrConcat(other, self)

    def __translate__(self, translator):
        translated = self.trstr.__translate__(translator)
        targ = deep_translate(self.arg, translator)
        try:
            result = translated % targ
        except TypeError as exc:
            logger.exception(
                "Unable to format translated message into '%s': %s",
                getattr(translator, "locale", "unknown"),
                str(self.trstr),
                exc_info=exc,
            )
            translated = self.trstr.__translate__(dummy_translator)
            try:
                result = translated % targ
            except TypeError:
                raise exc from None
        return result


class TrStrFormat(Translatable):
    def __init__(self, trstr: Translatable, args: Sequence, kwargs: Mapping):
        self.trstr = trstr
        self.args = args
        self.kwargs = kwargs

    def __str__(self) -> str:
        return str(self.trstr).format(
            *deep_cast_to_str(self.args),
            **deep_cast_to_str(self.kwargs),
        )

    def __add__(self, other: TranslatableOrStr):
        return TrStrConcat(self, other)

    def __radd__(self, other: TranslatableOrStr):
        return TrStrConcat(other, self)

    def __translate__(self, translator):
        translated = self.trstr.__translate__(translator)
        targs = deep_translate(self.args, translator)
        tkwargs = deep_translate(self.kwargs, translator)
        try:
            result = translated.format(*targs, **tkwargs)
        except (KeyError, IndexError) as exc:
            logger.exception(
                "Unable to format translated message into '%s': %s",
                getattr(translator, "locale", "unknown"),
                str(self.trstr),
                exc_info=exc,
            )
            translated = self.trstr.__translate__(dummy_translator)
            try:
                result = translated.format(*targs, **tkwargs)
            except (KeyError, IndexError):
                raise exc from None
        return result


def deep_translate(value, translator: Translator) -> Any:
    if value is None or isinstance(value, (str, int, float)):
        return value
    if trmeth := getattr(value, "__translate__", None):
        return trmeth(translator)
    if isinstance(value, tuple):
        return tuple(deep_translate(i, translator) for i in value)
    if isinstance(value, list):
        return [deep_translate(i, translator) for i in value]
    if isinstance(value, dict):
        return {k: deep_translate(v, translator) for k, v in value.items()}
    return value


class trstr_factory:
    def __init__(self, domain: str):
        self.domain = domain

    def gettext(self, message: str) -> TrStr:
        return TrStr(message, domain=self.domain, stacklevel=2)

    def pgettext(self, context: str, message: str) -> TrStr:
        return TrStr(message, context=context, domain=self.domain, stacklevel=2)

    def ngettext(self, singular: str, plural: str, number: int) -> TrStr:
        return TrStr(singular, plural=plural, number=number, domain=self.domain, stacklevel=2)

    def npgettext(self, context: str, singular: str, plural: str, number: int) -> TrStr:
        return TrStr(
            singular,
            plural=plural,
            number=number,
            context=context,
            domain=self.domain,
            stacklevel=2,
        )

    def gettextf(self, message: str) -> TrTpl:
        return TrTpl(message, domain=self.domain)

    def pgettextf(self, context: str, message: str) -> TrTpl:
        return TrTpl(message, context=context, domain=self.domain)

    def ngettextf(self, singular: str, plural: str, number: int) -> TrTpl:
        return TrTpl(singular, plural=plural, number=number, domain=self.domain)

    def npgettextf(self, context: str, singular: str, plural: str, number: int) -> TrTpl:
        return TrTpl(
            singular,
            plural=plural,
            number=number,
            context=context,
            domain=self.domain,
        )

    def __call__(self, message: str) -> TrStr:
        """Alias for gettext"""
        return TrStr(message, domain=self.domain, stacklevel=2)


class DummyTranslator(Translator):
    def translate(
        self,
        msg,
        *,
        plural=None,
        number=None,
        context=None,
        domain,
    ):
        if plural is not None:
            assert number is not None
            if number > 1:
                return plural
        return msg


dummy_translator = DummyTranslator()
deep_cast_to_str = partial(deep_translate, translator=dummy_translator)
