import io
import os
import os.path
import fnmatch
from importlib import import_module
from pathlib import Path
from pkg_resources import resource_filename

from babel.support import Translations as BabelTranslations

from ..lib.logging import logger
from ..package import pkginfo

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

    def load_envcomp(self, env, locale):
        for comp_id, comp in env._components.items():
            package_path = Path(resource_filename(pkginfo.comp_pkg(comp_id), '')).parent

            mod = import_module(pkginfo.comp_mod(comp_id))
            locale_path = Path(mod.__path__[0]) / 'locale'
            mo_path = locale_path / '{}.mo'.format(locale)

            if mo_path.is_file():
                logger.debug(
                    "Loading component [%s] translations for locale [%s] from [%s]",
                    comp_id, locale, str(mo_path.relative_to(package_path)))
                with io.open(mo_path, 'rb') as fp:
                    self.add(Translations(fp=fp, domain=comp_id))


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
            translated = str(trstr)

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
