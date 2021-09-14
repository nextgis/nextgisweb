# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

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
