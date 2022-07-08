from functools import partial
from inspect import signature

from ..logging import logger


class TrStr:

    def __init__(self, msg, *, domain, context=None):
        self.msg = msg
        self.domain = domain
        self.context = context

    def __str__(self):
        return self.msg

    def __mod__(self, arg):
        return TrStrModFormat(self, arg)

    def __add__(self, other):
        return TrStrConcat(self, other)

    def __radd__(self, other):
        return TrStrConcat(other, self)

    def format(self, *args, **kwargs):
        return TrStrFormat(self, args, kwargs)

    def __translate__(self, translator):
        return translator.translate(
            self.msg, domain=self.domain, context=self.context)


class TrStrConcat:

    def __init__(self, a, b):
        self._items = (a._items if isinstance(a, TrStrConcat) else [a]) \
            + (b._items if isinstance(b, TrStrConcat) else [b])

    def __str__(self):
        return "".join(map(str, deep_cast_to_str(self._items)))

    def __add__(self, other):
        return TrStrConcat(self, other)

    def __radd__(self, other):
        return TrStrConcat(other, self)

    def __translate__(self, translator):
        return "".join(map(str, deep_translate(self._items, translator)))


def translate_guard(errors):

    def actual_decorator(func):
        translate_args = 'translate_args' in signature(func).parameters

        def wrapper(trstr, original_translator):
            kwargs = dict() if not translate_args else dict(
                translate_args=trstr.__translate_args__(original_translator))

            try:
                return func(trstr, original_translator, **kwargs)
            except errors as exc:
                try:
                    result = func(trstr, dummy_translator, **kwargs)
                except errors:
                    raise exc from None
                else:
                    logger.exception(
                        'Got an exception during translation into "%s". '
                        'Falling back to untranslated message "%s".',
                        getattr(original_translator, 'locale', 'unknown'),
                        str(trstr), exc_info=exc)
                    return result

        return wrapper

    return actual_decorator


class TrStrModFormat:

    def __init__(self, trstr, arg):
        self.trstr = trstr
        self.arg = arg

    def __str__(self):
        return str(self.trstr) % deep_cast_to_str(self.arg)

    def __add__(self, other):
        return TrStrConcat(self, other)

    def __radd__(self, other):
        return TrStrConcat(other, self)

    def __translate_args__(self, translator):
        return deep_translate(self.arg, translator)

    @translate_guard(TypeError)
    def __translate__(self, translator, translate_args):
        return self.trstr.__translate__(translator) % translate_args


class TrStrFormat:

    def __init__(self, trstr, args, kwargs):
        self.trstr = trstr
        self.args = args
        self.kwargs = kwargs

    def __str__(self):
        return str(self.trstr).format(
            *deep_cast_to_str(self.args), **deep_cast_to_str(self.kwargs))

    def __add__(self, other):
        return TrStrConcat(self, other)

    def __radd__(self, other):
        return TrStrConcat(other, self)

    def __translate_args__(self, translator):
        return (
            deep_translate(self.args, translator),
            deep_translate(self.kwargs, translator)
        )

    def __translate_message__(self, translator):
        return self.trstr.__translate__(translator)

    @translate_guard((KeyError, IndexError))
    def __translate__(self, translator, translate_args):
        args, kwargs = translate_args
        return self.trstr.__translate__(translator).format(*args, **kwargs)


def deep_translate(value, translator):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if trmeth := getattr(value, '__translate__', None):
        return trmeth(translator)
    if isinstance(value, tuple):
        return tuple(deep_translate(i, translator) for i in value)
    if isinstance(value, list):
        return [deep_translate(i, translator) for i in value]
    if isinstance(value, dict):
        return {k: deep_translate(v, translator) for k, v in value.items()}
    return value


def deep_cast_to_str(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if hasattr(value, '__translate__'):
        return str(value)
    if isinstance(value, tuple):
        return tuple(deep_cast_to_str(i) for i in value)
    if isinstance(value, list):
        return [deep_cast_to_str(i) for i in value]
    if isinstance(value, dict):
        return {k: deep_cast_to_str(v) for k, v in value.items()}
    return value


def trstr_factory(domain):
    return partial(TrStr, domain=domain)


class DummyTranslator:
    def translate(self, msg, *, context=None, domain=None):
        return msg


dummy_translator = DummyTranslator()
