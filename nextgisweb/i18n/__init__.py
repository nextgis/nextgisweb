# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import logging
import inspect

from .trstring import TrString, trstring_factory # API # NOQA
from .localizer import Translations, Localizer # API # NOQA

logger = logging.getLogger(__name__)


def tcheck(arg):
    """ Check translation in mako-template

    If added to default_filters allows to see examplars of
    TranslationString in logs for which translation was not completed. """

    if isinstance(arg, TrString):
        frame = inspect.stack()[1][0]
        template_uri = frame.f_globals.get('_template_uri', '<unknown>')

        # TODO: Add string definition in the template itself
        logger.warning("Translation required at %s, msgid '%s'" % (
            template_uri, arg))

    return arg
