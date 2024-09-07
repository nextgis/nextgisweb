from sqlalchemy import *  # noqa: F403
from sqlalchemy import event, func, sql, types  # noqa: F401
from sqlalchemy.orm import *  # noqa: F403
from typing_extensions import deprecated

import nextgisweb.lib.saext as saext


@deprecated(
    "Use 'from nextgisweb.lib.saext import Enum' instead, which available "
    "since nextgisweb >= 4.9.0.dev14."
)
class Enum(saext.Enum):
    pass
