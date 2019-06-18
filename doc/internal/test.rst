Testing framework
=================

NextGIS Web testing framework is based on `pytest <https://pytest.org>`_ library with some additions (predefined fixtures, marks) and conventions. It supports unit and functional tests.

File layout
-----------

Each NextGIS Web component have own set of tests located inside ``test`` directory.  Consider directory structure on example fom  package ``package`` and component ``component``.

::

    .                               # Repository root directory
    ├── package                     # Package source root
    │   ├── component               # Component root directory
    │   │   ├── test                # Test root directory
    │   │   │   ├── data            # Test data directory
    │   │   │   ├── __init__.py     # Dummy __init__ module
    │   │   │   └── test_*.py       # Test module files
    │   │   └── __init__.py         # And other component files
    │   └── __init__.py             # Package files and other components
    └── setup.py                    # Setuptools configuration file

Unit tests
----------

Unit tests designed to test functionality of a specific module and usually do not need additional configuration. Just refer `pytest documentation <https://docs.pytest.org/en/latest/contents.html>`_ and `Writing tests`_ section.


.. code-block:: python

    # package/component/test/test_unit.py
    from package.component import some_function

    def test_some_function():
        assert some_function(1) == 0


Functional tests
----------------

Functional tests operate on data and NextGIS Web must be configured and  initialized database (``nextgisweb initialize_db``). Some tests can modify data so don't run functional tests on production instances.


Server side
^^^^^^^^^^^

Server side tests executed in same context as others NextGIS Web console scripts. Enviroment can be loaded with ``env`` fixture wich initializes components.

.. code-block:: python

    # package/component/test/test_env.py

    def test_component(env):
        env.component.some_component_method()


If the test needs to be performed as part of transaction that needs to be aborted, you can use transaction fixture ``txn``.

.. code-block:: python

    # package/component/test/test_txn.py
    from package.component.model import SomeModel

    def test_transaction(txn):
        SomeModel(field='value').persist()  # Dummy record insert
        DBSession.flush()


Web application
^^^^^^^^^^^^^^^

For testing via HTTP requests fixture ``webapp`` can be used. It's represents `WebTest's <https://docs.pylonsproject.org/projects/webtest/en/latest/index.html>`_ `TestApp <https://docs.pylonsproject.org/projects/webtest/en/latest/api.html>`_ instance wich can be used for doing requests.

.. code-block:: python

    # package/component/test/test_webapp.py

    def test_api_method(webapp):
        webapp.get('/api/component/component/method')


Writing tests
-------------

Naming conventions
^^^^^^^^^^^^^^^^^^

Follow pytest default naming conventions - test modules and function should be prefixed with ``test_``.

.. note::

    Do not forget to add an dummy ``__init__.py`` file to test directory. Otherwise pytest will not be able to handle names of the modules.

Relative imports
^^^^^^^^^^^^^^^^

Pytest doesn't support well relative imports in test modules. So don't use relative imports and use absolute imports instead. For example:

.. code-block:: python

    # package/component/test/test_import.py

    from ..model import SomeModel                   # Wrong way!
    from package.component.model import SomeModel   # It's OK!


Running tests
-------------

.. code-block:: shell

    $ export NEXTGISWEB_CONFIG=path/to/config.ini
    $ python -m pytest -v path/to/package