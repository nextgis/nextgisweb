import re

from ..lib.i18n import trstr_factory

COMP_ID = 'auth'
_ = trstr_factory(COMP_ID)


def clean_user_keyname(value):
    # Replace all invalid chars with underscores
    value = re.sub(r'(_*[^A-Za-z0-9_]+)+_*', '_', value)

    # Add "u" prefix if it doesn't start with letter
    value = re.sub(r'^_*([^A-Za-z])', r'u\1', value)

    # Strip underscores
    value = value.strip('_')

    return value


def enum_name(value, idx, sep='_'):
    if idx > 0:
        value = value.rstrip(sep)
        value += sep + str(idx + 1)
    return value
