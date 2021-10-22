from lxml.etree import Element

from ..i18n import trstring_factory

COMP_ID = 'wfsserver'
_ = trstring_factory(COMP_ID)


def validate_tag(tag):
    try:
        Element(tag)
    except ValueError:
        return False
    else:
        return True
