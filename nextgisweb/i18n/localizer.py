import fnmatch
import os
import os.path

from babel.support import Translations as BabelTranslations

from nextgisweb.lib.logging import logger


class Translations(BabelTranslations):
    def scandir(self, directory, locale):
        mofiles = []
        for root, dirnames, filenames in os.walk(directory):
            for fn in fnmatch.filter(filenames, "*.mo"):
                mofiles.append(os.path.join(root, fn)[len(directory) + 1 :])

        for mofile in mofiles:
            flocale = mofile.split(os.sep, 1)[0]
            fdomain = os.path.split(mofile)[1][:-3]
            if flocale != locale:
                continue
            with open(os.path.join(directory, mofile), "rb") as fp:
                dtrans = Translations(fp=fp, domain=fdomain)
            self.add(dtrans)

    def load_envcomp(self, env, locale):
        self.locale = locale
        for comp_id, comp in env.components.items():
            mo_path = comp.root_path / "locale" / "{}.mo".format(locale)
            if mo_path.is_file():
                logger.debug(
                    "Loading [%s] component [%s] translation from [%s]", comp_id, locale, mo_path
                )
                with mo_path.open("rb") as fp:
                    self.add(Translations(fp=fp, domain=comp_id))

    def translate(
        self,
        message,
        *,
        plural,
        number,
        domain,
        context,
    ):
        # TODO: Call these methods directly from TrStr
        if context is not None:
            return (
                self.dpgettext(domain, context, message)
                if plural is None
                else self.dnpgettext(domain, context, message, plural, number)
            )
        else:
            return (
                self.dgettext(domain, message)
                if plural is None
                else self.dngettext(domain, message, plural, number)
            )


class Localizer:
    def __init__(self, locale, translations):
        self.locale_name = locale
        self.translations = translations
        self.pluralizer = None
        self.translator = None

    def translate(self, value):
        if trmeth := getattr(value, "__translate__", None):
            return trmeth(self.translations)
        return value
