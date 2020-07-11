# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import

from sqlalchemy import *                    # NOQA
from sqlalchemy.orm import *                # NOQA
from sqlalchemy.ext.declarative import *    # NOQA

from sqlalchemy import event                # NOQA
from sqlalchemy import sql                  # NOQA
from sqlalchemy import func                 # NOQA
from sqlalchemy import types                # NOQA

from sqlalchemy import Enum as _Enum
from sqlalchemy.dialects.postgresql import UUID as _UUID

import json as _json


class Enum(_Enum):
    """ sqlalchemy.Enum wrapped with native_enum=False pre-installed"""

    def __init__(self, *args, **kwargs):
        if 'native_enum' in kwargs:
            assert kwargs['native_enum'] is False
        else:
            kwargs['native_enum'] = False
        super(Enum, self).__init__(*args, **kwargs)


class UUID(_UUID):
    """ SQLAclhemy-s PostgreSQL UUID wrapper with as_uuid=True by default """

    def __init__(self, *args, **kwargs):
        if 'as_uuid' not in kwargs:
            kwargs['as_uuid'] = True
        super(UUID, self).__init__(*args, **kwargs)


class JSONText(types.TypeDecorator):
    impl = types.Unicode

    def process_bind_param(self, value, dialect):
        return _json.dumps(value)

    def process_result_value(self, value, dialect):
        return _json.loads(value)
