Upgrade
=======

In general NextGIS Web upgrade process consist of the following steps:

* Stop services
* Create backup
* Upgrade packages
* Apply migrations
* Start services


Stopping services and creating backup
-------------------------------------

Previous sections describe services and backups. For example, it may look as
follows:

.. code-block:: none

  # systemctl stop ngw.service ngw-maintenance.timer
  # su ngw -c "nextgisweb backup"


Upgrading packages
------------------

Switch to ``ngw`` user (do not forget about virtualenv and ``NEXTGISWEB_CONFIG``
environment variable if you hadn't added them to ``.bashrc``):

.. code-block:: none

  # su ngw
  $ cd

Change directory to ``package/nextgisweb``, pull latest changes, and look at
available version tags:

.. code-block:: none

  $ cd package/nextgisweb
  $ git pull
  $ git tag -l '*.*.*'
  3.5.1
  3.6.0
  3.7.0

Of course, you can use any other version, including a ``master`` branch, but
here we consider an upgrade to the ``3.7.0`` version as an example. So check it
out, upgrade the package in virtualenv and recompile i18n translations:

.. code-block:: none

  $ git checkout 3.7.0
  $ cd ..
  $ pip install -e nextgisweb
  $ nextgisweb-i18n -p nextgisweb compile

And then, go to the home directory and update Node.js and Yarn project
environment with workspaces, and build necessary files:

.. code-block:: none

  $ cd
  $ nextgisweb jsrealm.install
  $ yarn run build

Repeat these steps with additional packages such as ``nextgisweb_qgis`` and
``nextgisweb_mapserver``. Some of them may require additional steps, such as
upgrading system software.

After that you return to ``ngw`` home directory:

.. code-block:: none

  $ cd ~

.. _applying migrations:

Applying migrations
-------------------

Upgrading from 3.7.0 or higher
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Automatic database migrations were introduced in version ``3.7.0``. If you're
upgrading from ``3.7.0`` or higher, check required migrations with:

.. code-block:: none

  $ nextgisweb migration.upgrade

And then apply them with:

.. code-block:: none

  $ nextgisweb migration.upgrade --no-dry-run

Upgrading from previous versions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

In case of upgrade from a version before ``3.7.0``, you should manually apply
SQL migrations from ``package/nextgisweb/migration`` directory before you run
automatic migration.

Files in that directory are prefixed by date, so you have to run them one-by-one
in historical order. The command ``nextgisweb sql -f`` can help you with that:

.. code-block:: none

  $ nextgisweb sql -f package/nextgisweb/migration/2001-01-01-filename.sql

Don't worry about applying SQL-migration twice. If it's already applied, it will
fail with an error and doesn't change any data.

When all SQL-migrations are applied you should run automatic migrations with
commands given above:

.. code-block:: none

  $ nextgisweb migration.upgrade
  $ nextgisweb migration.upgrade --no-dry-run


Starting services
-----------------

Now you can start services back. It may look as follows:

.. code-block:: none

  # systemctl start ngw.service ngw-maintenance.timer