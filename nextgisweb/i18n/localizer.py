# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import os
import os.path
import fnmatch
import six

from babel.support import Translations as BabelTranslations

from .trstring import TrString


class Translations(BabelTranslations):
    def scandir(self, directory, locale):
        mofiles = []
        for root, dirnames, filenames in os.walk(directory):
            for fn in fnmatch.filter(filenames, '*.mo'):
                mofiles.append(os.path.join(root, fn)[len(directory) + 1:])

        for mofile in mofiles:
            flocale = mofile.split(os.sep, 1)[0]
            fdomain = os.path.split(mofile)[1][:-3]
            if flocale != locale:
                continue
            with open(os.path.join(directory, mofile), 'rb') as fp:
                dtrans = Translations(fp=fp, domain=fdomain)
            self.add(dtrans)


def dugettext_policy(translations, trstr, domain, context):
    if domain is None:
        domain = getattr(trstr, 'domain', None) or 'messages'
    context = context or getattr(trstr, 'context', None)
    msgid = trstr
    translated = translations.dugettext(domain, msgid)
    return trstr if translated == msgid else translated


def translator(translations):
    def _translator(trstr, domain=None, context=None):
        if not isinstance(trstr, TrString):
            return trstr

        translated = trstr
        domain = domain or trstr.domain
        context = context or trstr.context

        if translations is not None:
            translated = dugettext_policy(translations, trstr, domain, context)
        if translated == trstr:
            translated = six.text_type(trstr)

        if trstr.modarg is not None:
            translated = translated % trstr.modarg

        return translated

    return _translator


class Localizer(object):
    def __init__(self, locale, translations):
        self.locale_name = locale
        self.translations = translations
        self.pluralizer = None
        self.translator = None

    def translate(self, tstring, domain=None):
        if self.translator is None:
            self.translator = translator(self.translations)
        return self.translator(tstring, domain=domain)
