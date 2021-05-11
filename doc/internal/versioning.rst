Package versioning
==================

NextGIS Web itself and most extension packages use `bump2version`_ to manage
versions. Here is the sample configuration file ``.bumpversion.cfg``, which
should be placed next to ``setup.py``:

.. _bump2version: https://github.com/c4urself/bump2version

.. code-block:: ini

  [bumpversion]
  current_version = 1.0.0.dev0
  parse = (?P<major>\d+)\.(?P<minor>\d+)\.(?P<patch>\d+)(\.(?P<release>[a-z]+)(?P<dev>\d+))?
  serialize = 
    {major}.{minor}.{patch}.{release}{dev}
    {major}.{minor}.{patch}
  tag_name = {new_version}
  message = Bump version to {new_version}
  commit = False
  tag = False

  [bumpversion:part:release]
  optional_value = release
  values = 
    dev
    release

  [bumpversion:part:dev]

  [bumpversion:file:VERSION]

This configuration provides `PEP 440`_ compatible version numbers, which consist
of ``major``, ``minor``, ``patch`` and ``dev`` parts. And the special part
``release`` separates release and development versions.

.. _PEP 440: https://www.python.org/dev/peps/pep-0440/

The current version is stored in ``bumpversion.cfg`` and ``VERSION`` files. In
``setup.py`` Python package version should be read from ``VERSION`` like this:

.. code-block:: python

  from setuptools import setup

  with open('VERSION', 'r') as fd:
      VERSION = fd.read().rstrip()

  setup(
      name='nextgisweb_foo',
      version=VERSION,
      # ...
  )

Bump2version provides tools for incrementing version parts and for updation
files where it is stored. If the current version is ``4.3.2.dev1`` incrementing
different parts will with ``bump2version part`` lead to the following results:
``major`` → ``5.0.0.dev0``, ``minor`` → ``4.4.0.dev0``, ``patch`` →
``4.3.3.dev0``, ``dev`` → ``4.3.2.dev2``, ``release`` → ``4.3.2``

As you see, it increments the given part and sets the following parts to zero.
Incrementing of ``release`` part just drops ``.devX`` suffix (actually it
becomes ``.release0`` but this part is declared as optional).


Package configuration
---------------------

1. Decide which version is the current, ``1.0.0.dev0`` in the example.
2. Create ``.bumpversion.cfg`` file from the template above.
3. Create ``VERSION`` text file and place the current version there.
4. Adapt ``setup.py`` with the example above.

Development versions
--------------------

Incrementing ``dev`` version part is helpful in dependencies between packages.
Imagine you have added some function in ``nextgisweb`` core package and now you
want to use it in the extension package. 

So, in ``nextgisweb`` package:

.. code-block:: bash

  $ cd package/nextgisweb
  $ cat VERSION
  3.8.0.dev0
  $ bump2version --commit dev
  $ cat VERSION
  3.8.0.dev1

In the extension package ``nextgisweb_foo`` you can use this version in
requirements in ``setup.py``:

.. code-block:: python

  from setuptools import setup

  setup(
      name='nextgisweb_foo',
      version=VERSION,
      # ...
      install_requires=[
          'nextgisweb>=3.8.0.dev1',
      ],
      # ...
  )

This prevents installation and usage of ``nextgisweb_foo`` package when
``nextgisweb`` version is lower than ``3.8.0.dev1``.

.. note::

  The ``3.8.0.dev1`` version in lower than ``3.8.0`` and higher than ``3.7.0``.

It's also possible to increment the version during git merge, for example:

.. code-block:: bash

  $ cd package/nextgisweb
  $ cat VERSION
  3.8.0.dev1
  $ git merge --no-commit some-feature-branch
  $ bump2version --allow-dirty dev
  $ cat VERSION
  3.8.0.dev2
  $ git add VERSION .bumpversion.cfg
  $ git commit

Release versions
----------------

To create release version use the following commands:

.. code-block:: bash

  $ cd package/nextgisweb
  $ cat VERSION
  3.8.0.dev2
  $ bump2version --commit --tag release
  $ cat VERSION
  3.8.0

Then start new minor (or major) version:

.. code-block:: bash

  $ bump2version --commit minor
  $ cat VERSION
  3.9.0.dev0

And push tags to remote repository:

.. code-block:: bash

  $ git push --tags origin master

Backports and patches
---------------------

Sometimes it's required to backport critical bug fixes to previous major and
minor versions. These fixes should be done in a separate branch. So if it
doesn't exist, create it from a tag:

.. code-block:: bash

  $ git checkout 3.8.0
  $ git branch 3.8.x

Then use ``git cherry-pick`` to backport required commit and increment ``patch``
version component:

.. code-block:: bash

  $ git cherry-pick --no-commit commit-hash
  $ bump2version --allow-dirty patch
  $ git add VERSION .bumpversion.cfg
  $ git commit

And then create a new release version and push it to the repository:

.. code-block:: bash

  $ bump2version --commit --tag release
  $ git push --tag origin 3.8.x
