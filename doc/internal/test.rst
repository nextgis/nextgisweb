Testing framework
=================

NextGIS Web testing framework is based on `pytest <https://pytest.org>`_ library
with some additions (predefined fixtures, marks) and conventions. It supports
unit and functional tests.

File layout
-----------

Each NextGIS Web component have its own set of tests located inside ``test``
directory.  Consider the directory structure on the example for package
``package`` and component ``component``.

::

  🗁                               # Repository root directory
  ├── 🗁 package                   # Package source root
  │   ├── 🗁 component             # Component root directory
  │   │   ├── 🗁 test              # Test root directory
  │   │   │   ├── 🗀 data          # Test data directory
  │   │   │   ├── 🗎 __init__.py   # Dummy __init__ module
  │   │   │   └── 🗎 test_*.py     # Test module files
  │   │   └── 🗎 __init__.py       # And other component files
  │   └── 🗎 __init__.py           # Package files and other components
  └── 🗎 setup.py                  # Setuptools configuration file

Unit tests
----------

Unit tests are designed for testing modules and usually don't require additional
configuration. Refer `pytest documentation
<https://docs.pytest.org/en/latest/contents.html>`_ and `Writing tests`_
section.

.. code-block:: python

  # package/component/test/test_unit.py
  from .. import some_function

  def test_some_function():
      assert some_function(1) == 0

Functional tests
----------------

Functional tests operate on data, and NextGIS Web must be configured and have
the database initialized via ``nextgisweb initialize_db``. Some tests modify
data, so don't run these tests in a production environment.

Server-side
^^^^^^^^^^^

Server-side tests are executed in the same context as other NextGIS Web console
scripts. The environment can be loaded with ``ngw_env`` fixture, which
initializes components and the environment.

.. code-block:: python

  # package/component/test/test_env.py

  def test_component(ngw_env):
      ngw_env.component.some_component_method()

Tests inside a transaction can be performed using ``ngw_txn`` fixture. It begins
a new transaction and rollbacks it at exit, flushing changes to the database
before that.

.. code-block:: python

  # package/component/test/test_txn.py
  from ..model import SomeModel

  def test_transaction(ngw_txn):
      SomeModel(field='value').persist()  # Dummy record insert


Web application
^^^^^^^^^^^^^^^

For testing via HTTP requests fixture ``ngw_webtest_app`` can be used. It's
represents `WebTest
<https://docs.pylonsproject.org/projects/webtest/en/latest/index.html>`_
`TestApp <https://docs.pylonsproject.org/projects/webtest/en/latest/api.html>`_
instance which can be used for doing requests.

.. code-block:: python

  # package/component/test/test_webapp.py

  def test_api_method(ngw_webtest_app):
      ngw_webtest_app.get('/api/component/component/method')


Writing tests
-------------

Naming conventions
^^^^^^^^^^^^^^^^^^

Follow pytest default naming conventions - test modules and functions must have
``test_`` prefix.

.. note::

  Do not forget to add a dummy ``__init__.py`` file to the ``test`` directory.

Running tests
-------------

.. code-block:: shell

  $ export NEXTGISWEB_CONFIG=path/to/config.ini
  $ python -m pytest package                     # All tests from package
  $ python -m pytest package/component           # Only tests from component
  $ python -m pytest --pyargs package.component  # Same but by Python module name

.. note::

  The last option with ``--pyargs`` might be useful when running tests in Crater
  / NGWDocker environment. Path-based options won't work because of symlinks
  inside ``site-packages`` directory.
