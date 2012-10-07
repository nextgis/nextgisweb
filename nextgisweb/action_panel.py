class Panel(object):
    def __init__(self, sections=None):
        if not sections:
            sections = []
        self.sections = sections


P = Panel


class Section(object):
    def __init__(self, key, title, items=None):
        if not items:
            items = []
        self.key = key
        self.title = title
        self.items = items


S = Section


class Item(object):
    def __init__(self, text, link):
        self.text = text
        self.link = link


I = Item
