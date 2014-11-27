Компоненты и окружение
======================

Для обеспечения модульности в NGW используются разделение на компоненты. Один python-пакет может содержать один или несколько компонентов. Каждый компонент является наследником класса :py:class:`~nextgisweb.component.Component`, а для загрузки соответствующих модулей используются точки входа (entry points) setuptools.

.. code-block:: python
    
    def pkginfo():
        return dict(components=dict(
            somecomp='somepackage.somecomp'))

    setup(
        name = 'somepackage',
        entry_points = {'nextgisweb.packages':
            'somepackage = somepackage:somemod:pkginfo'}
    )

У каждого компонента есть идентификатор (``somecomp`` в примере выше). Так же этот идентификатор указываетс в атрибуте класса :py:attr:`~nextgisweb.component.Component.identity`. Этот идентификатор должен быть уникален в рамках всех пакетов NGW.

Для объединения компонентов в единое целое используется `объект-окружение`, экземпляр класса :py:class:`~nextgisweb.env.Env`, который создается на этапе инициализации. Инициализация происходит следующим образом:

1. Создаются экземпляры компонентов
2. Для каждого компонента вызывается :py:meth:`~nextgisweb.component.Component.initialize`
3. Для каждого компонента вызывается :py:meth:`~nextgisweb.component.Component.configure`


Зависимости между компонентами
------------------------------

Вызовы методов :py:meth:`~nextgisweb.component.Component.initialize` и :py:meth:`~nextgisweb.component.Component.configure` осуществляются с учетом зависимостей, которые могут быть указаны при помощи декоратора :py:func:`~nextgisweb.component.require`.

.. autofunction:: nextgisweb.component.require

Таким образом, если необходимо вызывать ``initialize()`` компонента ``B`` после ``A``, то выглядеть это будет следующим образом:

.. code-block:: python

    from nextgisweb.component import Component, require
    
    class A(Component):
        identity = 'A'

        def initialize(self):
            pass

    class B(Component):
        identity = 'B'

        @require('A')
        def initialize(self):
            pass

Глобальный объект окружение
---------------------------

.. autoclass:: nextgisweb.env.env

Класс Component
------------------------------

.. autoclass:: nextgisweb.component.Component
    :members: 

Класс Env
------------------------

.. autoclass:: nextgisweb.env.Env
    :members: 