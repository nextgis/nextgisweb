import re
from datetime import timedelta


class OptionType(object):
    OTYPE_MAPPING = {}

    @classmethod
    def normalize(cls, otype):
        if isinstance(otype, OptionType):
            return otype
        elif issubclass(otype, OptionType):
            return otype()
        elif otype in cls.OTYPE_MAPPING:
            return cls.OTYPE_MAPPING[otype]
        else:
            raise TypeError("Invalid option type!")

    def __str__(self):
        return 'unknown'

    def loads(self, value):
        raise NotImplementedError()

    def dumps(self, value):
        raise NotImplementedError()


class Text(OptionType):

    def __str__(self):
        return 'text'

    def loads(self, value):
        return value

    def dumps(self, value):
        return value if value is not None else ''


class Boolean(OptionType):

    def __str__(self):
        return 'boolean'

    def loads(self, value):
        lw = value.lower()
        if lw in ('true', 'yes', '1'):
            return True
        elif lw in ('false', 'no', '0'):
            return False
        else:
            raise ValueError("Invalid boolean value!")

    def dumps(self, value):
        return {True: 'true', False: 'false', None: ''}[value] \
            if value is not None else ''


class Integer(OptionType):

    def __str__(self):
        return 'integer'

    def loads(self, value):
        return int(value)

    def dumps(self, value):
        return str(value) if value is not None else ''


class Float(OptionType):

    def __str__(self):
        return 'float'

    def loads(self, value):
        return float(value)

    def dumps(self, value):
        return str(value) if value is not None else ''


class List(OptionType):

    def __init__(self, otype=str, separator=r'\s*\,\s*'):
        self._otype = OptionType.normalize(otype)
        self._separator = separator

    def __str__(self):
        return "list<{}>".format(self._otype)

    def loads(self, value):
        return [self._otype.loads(v) for v in re.split(self._separator, value)]

    def dumps(self, value):
        return ', '.join(value) if value is not None else ''


class Timedelta(OptionType):
    _parts = (
        ('d', 24 * 60 * 60),
        ('h', 60 * 60),
        ('m', 60),
        ('', 1)
    )

    def __str__(self):
        return 'timedelta'

    def loads(self, value):
        for a, m in self._parts:
            if a == '' or value.lower().endswith(a):
                return timedelta(seconds=int(
                    value[:-len(a)] if a != ''
                    else value) * m)
        raise ValueError("Invalid timedelta value: " + value)

    def dumps(self, value):
        if value is None:
            return ''
        seconds = int(value.total_seconds())
        for a, m in self._parts:
            if seconds % m == 0:
                return '{}{}'.format(seconds // m, a)


class SizeInBytes(OptionType):
    _parts = ('', 'K', 'M', 'G', 'T')
    _pattern = re.compile(r'^(\d+) ?([KMGT]?)B?$', re.IGNORECASE)

    def __str__(self):
        return 'size_in_bytes'

    def loads(self, value):
        if match := self._pattern.match(value):
            units = int(match[1])
            suffix = match[2].upper()
            if suffix in self._parts:
                pow_ = self._parts.index(suffix)
                return units * 1024**pow_
        raise ValueError("Invalid SizeInBytes value: " + value)

    def dumps(self, value):
        if value is None:
            return ''
        for a, m in self._parts:
            if value % m == 0:
                return '{} {}'


OptionType.OTYPE_MAPPING[str] = Text()
OptionType.OTYPE_MAPPING[bool] = Boolean()
OptionType.OTYPE_MAPPING[int] = Integer()
OptionType.OTYPE_MAPPING[float] = Float()
OptionType.OTYPE_MAPPING[list] = List()
OptionType.OTYPE_MAPPING[timedelta] = Timedelta()
