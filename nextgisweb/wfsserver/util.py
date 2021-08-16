# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

import re

from ..i18n import trstring_factory

COMP_ID = 'wfsserver'
_ = trstring_factory(COMP_ID)

tag_pattern = re.compile(r'^[A-Za-z][\w]*$')
