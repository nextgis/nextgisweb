from humanize import naturalsize

from ..lib.i18n import trstr_factory

COMP_ID = 'core'
_ = trstr_factory(COMP_ID)


def format_size(value):
    return naturalsize(value, binary=True, format='%.0f')
