from .util import find_template

class PageSection:

    def __init__(
        self, key=None, title=None, priority=50,
        template=None, is_applicable=None,
        stack_level=0,
    ):
        if not is_applicable:
            is_applicable = _always_applicable

        self.key = key
        self.title = title
        self.priority = priority
        self.is_applicable = is_applicable

        if template and (':' not in template):
            template = find_template(template, stack_level=2 + stack_level)
        self.template = template



class PageSections:

    def __init__(self):
        self._items = []

    def __iter__(self):
        items = list(self._items)
        items.sort(key=lambda itm: itm.priority)
        return items.__iter__()

    def register(self, **kwargs):
        self._items.append(PageSection(stack_level=1, **kwargs))


def _always_applicable(*args, **kwargs):
    return True
