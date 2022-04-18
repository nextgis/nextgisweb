import inspect

from ..lib.logging import logger
from ..lib.i18n import trstr_factory

from .localizer import Translations, Localizer

__all__ = [
    'Translations',
    'Localizer',
    'translator',
]


def trstring_factory(domain):
    # from warnings import warn
    # warn(
    #     "Function 'nextgisweb.i18n.trstring_factory' has been deprecated. "
    #     "Replace it with 'nextgisweb.lib.i18n.trstr_factory'.",
    #     DeprecationWarning, stacklevel=2)
    return trstr_factory(domain)


def tcheck(arg):
    """ Check translation in mako-template

    If added to default_filters allows to see examplars of
    TranslationString in logs for which translation was not completed. """

    if hasattr(arg, '__translate__'):
        frame = inspect.stack()[1][0]
        template_uri = frame.f_globals.get('_template_uri', '<unknown>')

        # TODO: Add string definition in the template itself
        logger.warning("Translation required at %s, msgid '%s'" % (
            template_uri, arg))

    return arg
