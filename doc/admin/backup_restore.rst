Backup and restore
==================

As mentioned above NextGIS Web uses two data storages for different types of
data:

- PostgreSQL database used as general purpose relational database.
- Filesystem storage used for storing BLOBs like raster, attachments, etc.

Also NextGIS Web provides tools for backup and restore this data to / from
single-file archive. You can use any destination directory but these tools
provide some defaults wich may be usefull.

So before we begin, let's create default backup directory in ``/srv/ngw``:

.. code-block:: none

  $ mkdir backup

And set up backup directory in ``config/config.ini``:

.. code-block:: ini

  [core]
  # Other config options go here
  backup.path = /srv/ngw/backup

Backup
------

To create a backup you need to run command ``nextgisweb backup`` and it will
create backup and print it's filename:

.. code-block:: none

  $ nextgisweb backup
  /srv/ngw/backup/20200721-234619.ngwbackup

By default NextGIS Web uses `strftime`_ formatted for filename which is
``%Y%m%d-%H%M%S.ngwbackup``. In the example below 2020 is a year, 07 is a
month, 21 is a day and so on. Note that timestamps are always stored in UTC.

.. _strftime: https://docs.python.org/3/library/datetime.html#strftime-strptime-behavior


Restore
-------

Now try to restore NextGIS Web from previously created backup. You don't need to
stop NextGIS Web service during backup but you need to stop it during restore.
If you used systemd in the previous section just run as root following command:

.. code-block:: none

  # systemctl stop ngw.service

Then run ``nextgisweb restore`` command with filename argument:

.. code-block:: none

  $ nextgisweb restore backup/20200721-234619.ngwbackup

If you are restoring backup which made from some previous version, it may
require to apply migrations. The process of applying migrations is described in
:ref:`"Backup and restore"<applying migrations>` section. Follow instruction from
there, and then start NextGIS Web service again:

.. code-block:: none

  # systemctl start ngw.service