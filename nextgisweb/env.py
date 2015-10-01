# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import re

import sqlalchemy as sa

from .component import Component, load_all
from .package import pkginfo


class Env(object):

    def __init__(self, cfg):
        cs = dict(cfg.items('core') if cfg.has_section('core') else ())

        packages_ign = re.split(r'[,\s]+', cs.get('packages.ignore', ''))
        components_ign = re.split(r'[,\s]+', cs.get('components.ignore', ''))

        load_all(
            packages_ignore=packages_ign,
            components_ignore=components_ign)

        self._components = dict()

        for comp_class in Component.registry:
            identity = comp_class.identity

            if pkginfo.comp_pkg(identity) in packages_ign:
                continue
            if identity in components_ign:
                continue

            settings = dict(
                cfg.items(identity)
                if cfg.has_section(identity)
                else ())

            instance = comp_class(env=self, settings=settings)
            self._components[comp_class.identity] = instance

            assert not hasattr(self, identity), \
                "Attribute name %s already used" % identity

            setattr(self, identity, instance)

    def chain(self, meth):
        """ Построение последовательности вызова методов с учетом зависимостей.
        Зависимость от компонента ``core`` добавляется автоматически для всех
        компонентов, таким образом он всегда возвращается первым.

        :param meth: Имя метода, для которого строится последовательность. """

        seq = ['core', ]

        def traverse(components):
            for c in components:
                if c.identity not in traverse.seq:
                    if hasattr(getattr(c, meth), '_require'):
                        traverse([self._components[i] for i in getattr(
                            c, meth)._require])
                    traverse.seq.append(c.identity)

        traverse.seq = seq
        traverse(self._components.itervalues())

        return [self._components[i] for i in traverse.seq]

    def initialize(self):
        for c in list(self.chain('initialize')):
            c.initialize()

            if hasattr(c, 'metadata'):
                c.metadata.bind = self.core.engine

        for c in list(self.chain('configure')):
            c.configure()

    def metadata(self):
        """ Возвращает объект sa.MetaData объединяющий метаданные всех
        компонентов из этого окружения """

        metadata = sa.MetaData()

        for comp in self.chain('initialize'):
            if hasattr(comp, 'metadata'):
                for key, tab in comp.metadata.tables.iteritems():
                    ctab = tab.tometadata(metadata)
                    sa.event.listen(
                        ctab, 'after_create',
                        # После создания таблицы запишем имя компонента
                        # в комментарий, скорее для отладки.
                        sa.DDL(
                            "COMMENT ON TABLE %(fullname)s IS "
                            + "'" + comp.identity + "'"
                        ))

        return metadata


_env = None


def setenv(env):
    global _env
    _env = env


class EnvMetaClass(type):
    def __getattr__(cls, name):
        return getattr(_env, name)

    def __call__(cls):
        return _env


class env(object):
    """ Прокси-класс для доступа к глобальному окружению. Его следует
    использовать только там, где невозможно получить доступ к текущему
    окружению другими способами. Однако в любом случае, одновременная
    работа с несколькими окружениями сейчас не поддерживается и вряд ли
    это вообще когда-нибудь будет нужно. Для получение оригинального объекта,
    к которому проксируются обращения, можно использовать конструктор
    ``env()``. """

    __metaclass__ = EnvMetaClass
