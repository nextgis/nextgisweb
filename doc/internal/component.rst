Components and environment
==========================

NGW uses components for modularity. One python-пакет can contain
one or several components. Each component inherits class :py:class:`~nextgisweb.component.Component`, 
to load packages setuptools entry points are used.

.. code-block:: python
    
  def pkginfo():
      return dict(components=dict(
          somecomp='somepackage.somecomp'))

  setup(
      name = 'somepackage',
      entry_points = {'nextgisweb.packages':
          'somepackage = somepackage:somemod:pkginfo'}
  )

Each component has an ID (``somecomp`` in an example above). The same ID 
is used in a class attribute :py:attr:`~nextgisweb.component.Component.identity`. 
This ID must be unique among all packages of NGW.

To join components together instance of :py:class:`~nextgisweb.env.Env` class is used,
created at init. Initialization runs like this:

1. Component instances are created
2. :py:meth:`~nextgisweb.component.Component.initialize` is called for each component
3. :py:meth:`~nextgisweb.component.Component.configure` is called for each component


Dependencies between components
-------------------------------

Method calls for :py:meth:`~nextgisweb.component.Component.initialize` and
:py:meth:`~nextgisweb.component.Component.configure` happen in accordance
with dependencies, which can be set using decorator :py:func:`~nextgisweb.component.require`.

.. autofunction:: nextgisweb.component.require

So, is you need to call ``initialize()`` of component ``B`` after
``A`` do this:

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

Global env object
-----------------

.. autoclass:: nextgisweb.env.env

Component class
------------------------------

.. autoclass:: nextgisweb.component.Component
    :members: 

Env class
------------------------

.. autoclass:: nextgisweb.env.Env
    :members: 
