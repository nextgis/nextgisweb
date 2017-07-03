# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import

from sqlalchemy import *                    # NOQA
from sqlalchemy.orm import *                # NOQA
from sqlalchemy.ext.declarative import *    # NOQA

from sqlalchemy import event                # NOQA
from sqlalchemy import sql                  # NOQA
from sqlalchemy import func                 # NOQA

from sqlalchemy import Enum as _Enum


class Enum(_Enum):
    """ sqlalchemy.Enum wrapped with native_enum=False pre-installed"""

    def __init__(self, *args, **kwargs):
        if 'native_enum' in kwargs:
            assert kwargs['native_enum'] is False
        else:
            kwargs['native_enum'] = False
        super(Enum, self).__init__(*args, **kwargs)
