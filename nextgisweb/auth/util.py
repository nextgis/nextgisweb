import re

from ..i18n import trstring_factory

COMP_ID = 'auth'
_ = trstring_factory(COMP_ID)


def clean_user_keyname(value, idx=0):
    """Remove invalid chars from user keyname and optionaly add optional index to
    avoid conflicts"""

    value = re.sub(r'(_*[^A-Za-z0-9_]+)+_*', '_', value)
    value = re.sub(r'^([^A-Za-z\_])', r'_\1', value)
    if idx > 0:
        value += ('_{}' if not value.endswith('_') else '{}').format(idx)
    return value
