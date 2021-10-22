Database migrations
===================

When you change a database structure between revisions and versions, you have to
create database migrations. Migrations change a database structure from one
state to another.

NextGIS Web provides some tools to work with database migrations. These tools
were inspired by `alembic library <https://alembic.sqlalchemy.org/>`_  with the
additional support of multiple components and dependencies between migrations.

Under the hood, it's based on git-like tree structure with branches for each
component separately. Single migration is like git's commit which can be applied
(``forward`` operation) or reverted (``rewind`` operation).

.. note::

  Migrations framework doesn't support automatic migration creation at this
  moment. You might expect this, but now you have to write SQL scripts with your
  own hands. But it may change in the future.

Existing components
-------------------

For example, you have component ``foo`` which model definition had looked
like this:

.. code-block:: python

  class FooModel(Base):
      __tablename__ = 'foo_model'
      id = db.Column(db.Integer, primary_key=True)
      some = db.Column(db.Unicode)

You had decided to add a new field "other" and changed its definition to this:

.. code-block:: python

  class FooModel(Base):
      __tablename__ = 'foo_model'
      id = db.Column(db.Integer, primary_key=True)
      some = db.Column(db.Unicode)
      other = db.Column(db.Unicode)

Now you have to create the migration, which adds the ``other`` column to the
corresponding table. You can do this as follows:

.. code-block:: none

  $ nextgisweb migration.create foo "Add other column"
  Migration [foo:2c12ca17] created:
  * migration/2c12ca17-add-other-column.fw.sql
  * migration/2c12ca17-add-other-column.rw.sql

This command will generate two files, where you should put SQL instruction. The
first one ``2c12ca17-add-other-column.fw.sql`` is for forwarding migration,
which adds the column. The second one ``2c12ca17-add-other-column.rw.sql`` is
rewinding migration, which drops the column and brings a database state to the
previous.

You have to put SQL instructions into these files. Don't remove migrations
metadata in the first lines of files and remove a generated placeholder. For
example:

.. code-block:: sql
  :caption: File ``2c12ca17-add-other-column.fw.sql``

  /*** {
      "revision": "2c12ca17", "parents": ["00000000"],
      "date": "2021-01-09T21:57:55",
      "message": "Add other column"
  } ***/

  ALTER TABLE foo_model ADD COLUMN other text;

.. code-block:: sql
  :caption: File ``2c12ca17-add-other-column.rw.sql``

  /*** { "revision": "2c12ca17" } ***/

  ALTER TABLE foo_model DROP COLUMN other;

Now you can apply it using:

.. code-block:: none

  $ nextgisweb migration.forward --no-dry-run foo:2c12ca17

Or undo it with:

.. code-block:: none

  $ nextgisweb migration.rewind --no-dry-run foo:2c12ca17

.. note::

  Each ``nextgisweb migration.*`` command which changes a database state doesn't
  change without ``--no-dry-run`` option. You can use commands without this
  option to review what command will do.

To review the current database state you can use ``nextgisweb migration.status``
command. It will show this migration:

.. code-block:: none

  $ nextgisweb migration.status
  A |    | Migration                      | Message
  + |    | foo:00000000                   | Initial migration
  + | FR | foo:2c12ca17                   | Add other column

After that, you have to commit these files to git repository. The command
``nextgisweb migration.upgrade`` will apply them during the standard upgrade
process.


New components
--------------

When you create a new NextGIS Web component, you shouldn't create the initial
migration. Migration framework detects the presence of metadata and
automatically creates initial migration with revision id ``00000000``.

For example, you've created the component ``bar`` with a model like this:

.. code-block:: python

  class BarModel(Base):
      __tablename__ = 'bar_model'
      id = db.Column(db.Integer, primary_key=True)
      some = db.Column(db.Unicode)

Now you can ask NextGIS Web to create tables for this component:

.. note::

  Previously, you could use ``nextgisweb initialize_db``, but now you should use
  ``nextgisweb migration.install``.

.. code-block:: none

  $ nextgisweb migration.install --no-dry-run bar

Moreover, you can ask to drop tables for this (or any other component) with the
following command:

.. code-block:: none

  $ nextgisweb migration.uninstall --no-dry-run bar

Thus ``nextgisweb migration.install`` and ``nextgisweb migration.uninstall``
commands provide the way to install and uninstall components.

Python migrations
-----------------

Sometimes it's hard or impossible to write migration logic using SQL only. In
this case, it's possible to use Python module as a migration. So, a migration
module can be created this way:

.. code-block:: bash

  $ nextgisweb migration.create --format python foo "Add another column"
  Migration [foo:2e89a6fc] created:
  * migration/2e89a6fc-add-another-column.py

It works the same way as SQL migrations, but forward and rewind migrations are
both in one file.

.. code-block:: python

  """ {
      "revision": "2e89a6fc", "parents": ["2c12ca17"],
      "date": "2021-01-09T22:47:12",
      "message": "Add another column"
  } """

  
  def forward(ctx):
      pass  # TODO: Write code here and remove this placeholder line!


  def rewind(ctx):
      pass  # TODO: Write code here and remove this placeholder line!


The global ``env`` object can be accessed by ``ctx.env`` attribute. But keep in
mind that migration code is executed on outdated database structure. It means
that you shouldn't use SQLAlchemy models there.
