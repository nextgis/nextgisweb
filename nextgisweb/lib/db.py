from enum import Enum as StdEnum
from inspect import isclass

from sqlalchemy import *  # noqa: F403
from sqlalchemy import Enum as _Enum
from sqlalchemy import event, func, sql, types  # noqa: F401
from sqlalchemy.dialects.postgresql import JSONB  # noqa: F401
from sqlalchemy.dialects.postgresql import UUID as _UUID
from sqlalchemy.orm import *  # noqa: F403


class Enum(_Enum):
    """sqlalchemy.Enum wrapped with native_enum=False pre-installed"""

    def __init__(self, *args, **kwargs):
        # Freeze predefined arguments
        for k, v in (
            ("native_enum", False),
            ("create_constraint", False),
            ("validate_strings", True),
        ):
            if k in kwargs:
                assert kwargs[k] == v
            else:
                kwargs[k] = v

        assert "view_callable" not in kwargs
        if len(args) > 0:
            if isclass(std_enum := args[0]) and issubclass(std_enum, StdEnum):
                # By default SA uses Enum's names instead of values (as orjson
                # does). So, swap names and values.
                kwargs["values_callable"] = lambda o: [i.value for i in o]

        if "length" not in kwargs:
            kwargs["length"] = 50

        super().__init__(*args, **kwargs)


class UUID(_UUID):
    """SQLAclhemy-s PostgreSQL UUID wrapper with as_uuid=True by default"""

    def __init__(self, *args, **kwargs):
        if "as_uuid" not in kwargs:
            kwargs["as_uuid"] = True
        super().__init__(*args, **kwargs)
