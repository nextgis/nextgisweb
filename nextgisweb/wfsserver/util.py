from lxml.etree import Element

from ..lib.i18n import trstr_factory

COMP_ID = 'wfsserver'
_ = trstr_factory(COMP_ID)


def validate_tag(tag):
    try:
        Element(tag)
    except ValueError:
        return False
    else:
        return True
