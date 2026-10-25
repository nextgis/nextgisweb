from os import environ
from warnings import filterwarnings

# Enable deprecation warnings for nextgisweb and nextgisweb_* packages.
filterwarnings("once", module=r"^nextgisweb(_\w+)?(\..*|$)", category=DeprecationWarning)

# Deprecated pkg_resources is used extensively by Pyramid, setuptools is pinned.
filterwarnings(
    "ignore",
    r"^pkg_resources is deprecated as an API.*$",
    category=UserWarning,
)

# Prevent warning about missing __init__.py in migration directory. Is's OK
# and migration directory is intended for migration scripts.
filterwarnings(
    "ignore",
    r"^Not importing.*/core/migration.*__init__\.py$",
    category=ImportWarning,
)

# Exceptions will be enabled by default in GDAL 4 - OK, got it!
filterwarnings(
    "ignore",
    r"^Neither (gdal|ogr|osr)\.UseExceptions\(\) nor (gdal|ogr|osr)\.DontUseExceptions\(\).*$",
    category=FutureWarning,
)

# Disable NumPy's multithreading to keep fork safety.
for k in ("OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "OMP_NUM_THREADS", "BLIS_NUM_THREADS"):
    if k not in environ:
        environ[k] = "1"

# Preload NumPy to work around https://bugs.python.org/issue47082
import numpy  # noqa: E402, F401, isort: skip

# Ignore osgeo imp module deprecation warning
filterwarnings("ignore", module="osgeo", category=DeprecationWarning)
import osgeo  # noqa: E402, F401, isort: skip
