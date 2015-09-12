# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import logging
import inspect

from .trstring import TrString, trstring_factory # API # NOQA
from .localizer import Translations, Localizer # API # NOQA

logger = logging.getLogger(__name__)


def tcheck(arg):
    """ Проверка на выполнение перевода в mako-шаблоне

    При добавлении ее в default_filters позволяет отследить в логе экземпляры
    TranslationString для которых не был выполнен перевод. """

    if isinstance(arg, TrString):
        frame = inspect.stack()[1][0]
        template_uri = frame.f_globals.get('_template_uri', '<unknown>')

        # TODO: Также добавить определение строки в самом шаблоне
        logger.warning("Translation required at %s, msgid '%s'" % (
            template_uri, arg))

    return arg
