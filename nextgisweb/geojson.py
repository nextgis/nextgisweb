import warnings

from .lib.json import dumps, loads  # NOQA


warnings.warn(
    "The 'nextgisweb.geojson' module deprecated now and it's going to be "
    "removed in 4.2.0. Use the 'nextgisweb.lib.json' module instead.",
    DeprecationWarning, stacklevel=2)
