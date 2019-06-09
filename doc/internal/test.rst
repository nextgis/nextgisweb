Testing framework
=================

NextGIS Web testing framework is based on `pytest <https://pytest.org>`_ library with some additions (predefined fixtures, marks) and conventions. It supports unit and functional tests.

File layout
-----------

Each NextGIS Web component have own set of tests located inside ``test`` directory.  Consider directory structure on example fom  package ``package`` and component ``component``.

::

    .                           # Repository root directory
    ├── package                 # Package source root
    │   ├── component           # Component root directory
    │   │   ├── test            # Test root directory
    │   │   │   ├── data        # Test data directory
    │   │   │   └── test_*.py   # Test module files
    │   │   └── __init__.py     # And other component files
    │   └── __init__.py         # Package files and other components
    └── setup.py                # Setuptools configuration file

Unit tests
----------

Unit tests designed to test functionality of a specific module and usually do not need additional configuration. Just refer `pytest documentation <https://docs.pytest.org/en/latest/contents.html>`_ and `Writing tests`_ section.


.. code-block:: python

    # package/component/test/test_unit.py
    import pytest

    from package.component import some_function

    def test_some_function():
        assert some_function(1) == 0


Functional tests
----------------

Server mode
^^^^^^^^^^^

Web application
^^^^^^^^^^^^^^^

Writing tests
-------------

Relative imports
^^^^^^^^^^^^^^^^

For design reasons pytest doesn't support well relative imports in test modules. So don't use relative imports and use absolute imports instead. For example:

.. code-block:: python

    # package/component/test/test_import.py
    import pytest

    from ..model import SomeModel                   # Wrong way!
    from package.component.model import SomeModel   # It's OK!


Running tests
-------------
