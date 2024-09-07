import enum
from inspect import isclass

import sqlalchemy as sa


class Enum(sa.Enum):
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

        if len(args) > 0:
            if isclass(std_enum := args[0]) and issubclass(std_enum, enum.Enum):
                # By default SA uses Enum's names instead of values (as orjson
                # does). So, swap names and values.
                kwargs["values_callable"] = lambda o: [i.value for i in o]

        if "length" not in kwargs:
            kwargs["length"] = 50

        super().__init__(*args, **kwargs)
