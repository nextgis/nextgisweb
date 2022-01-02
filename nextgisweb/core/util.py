from humanize import naturalsize

from ..i18n import trstring_factory

COMP_ID = 'core'
_ = trstring_factory(COMP_ID)


def format_size(value):
    return naturalsize(value, binary=True, format='%.0f')
