"""Shared pytest fixtures for NextGIS Web tests

This module is registered as a pytest plugin via the entry point. It provides
fixtures shared between multiple NextGIS Web components and extensions.

NOTE: Code in this module should avoid importing nextgisweb.* modules at the
module level as it is loaded during pytest initialization phase. Otherwise,
pytest-cov won't be able to measure code coverage correctly.
"""

from .auth import *
from .core import *
from .env import *
from .file_upload import *
from .pyramid import *
from .resource import *


def pytest_addoption(parser):
    """Add pytest command-line options from submodules"""

    from . import core, env

    core.pytest_addoption(parser)
    env.pytest_addoption(parser)
