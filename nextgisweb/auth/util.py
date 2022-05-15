import re

from ..lib.i18n import trstr_factory

COMP_ID = 'auth'
_ = trstr_factory(COMP_ID)


def clean_user_keyname(value):
    """Remove invalid chars from user keyname"""

    value = re.sub(r'(_*[^A-Za-z0-9_]+)+_*', '_', value)
    value = re.sub(r'^([^A-Za-z\_])', r'_\1', value)
    return value


def enum_name(value, idx):
    """Add index to avoid conflicts"""

    if idx > 0:
        value += ('_{}' if not value.endswith('_') else '{}').format(idx)
    return value
