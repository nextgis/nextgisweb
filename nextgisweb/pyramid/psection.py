import re

from .tomb.config import find_template


class PageSection:
    def __init__(
        self,
        key=None,
        title=None,
        priority=50,
        template=None,
        is_applicable=None,
        stack_level=0,
    ):
        if not is_applicable:
            is_applicable = _always_applicable

        self.key = key
        self.title = title
        self.priority = priority
        self.is_applicable = is_applicable
        self.set_template(template, stack_level=stack_level)

    def set_template(self, value, *, stack_level=0):
        if value and (":" not in value):
            value = find_template(value, stack_level=3 + stack_level)
        self.template = value


class PageSections:
    def __init__(self, name):
        self._items = []
        self._name = name
        self._re_func_name = re.compile(re.escape(self._name) + r"(?:_(\w)+)?")

    def __iter__(self):
        items = list(self._items)
        items.sort(key=lambda itm: itm.priority)
        return items.__iter__()

    def __call__(self, key=None, *, title=None, priority=50, template=None):
        s = PageSection(key=key, title=title, priority=priority, template=template, stack_level=1)
        self._items.append(s)

        def _wrapper(func):
            if s.key is None:
                func_name = func.__name__
                if m := self._re_func_name.match(func_name):
                    s.key = m.groups(1)
                    if s.template is None:
                        s.set_template(f"{func_name}.mako", stack_level=1)
                else:
                    raise ValueError(f"invalid decorated function name: {func_name}")

            s.is_applicable = func

        return _wrapper


def _always_applicable(*args, **kwargs):
    return True
