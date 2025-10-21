Installation
============

NextGIS Web is modular software and this instruction covers only installation of
the core package called ``nextgisweb``. Other packages, such as
``nextgisweb_qgis`` and ``nextgisweb_mapserver`` can require additional steps to
install.

System requirements
-------------------

- Modern Linux distribution like Ubuntu Linux 22.04:

  - We expect that NextGIS Web can be installed on most modern Linux
    distributions. But we run it under LTS-version of Ubuntu Linux, and this
    instruction was tested on Ubuntu Linux 22.04.
  
  - We don't provide community support for running NextGIS Web on other
    distributions. So if you any installation-related issue, please try to
    reproduce a problem on Ubuntu Linux 22.04 before you report them.

- Python >= 3.10.

- GDAL >= 3.4.

- Node.js 20.x or higher and Yarn 1.x package manager. We recommend using
  NodeSource and Yarn package repositories.

- PostgreSQL database with PostGIS extension enabled:

  - The minimum required versions are PostgreSQL 12 and PostGIS 3.0.

  - PostgreSQL user must be owner of database and PostGIS system tables
    ``spatial_ref_sys``, ``geography_columns``, ``geometry_columns``,
    ``raster_columns`` and ``raster_overviews``.

  - PostgreSQL database shouldn't be used by other software or for other
    purposes. NextGIS Web modifies ``spatial_ref_sys`` table and attaches
    some triggers on it.

  - PostgreSQL and PostGIS installation is out-of-scope for this instruction.
    But for testing purpose you can use snippet bellow to install PostgreSQL 
    and PostGIS on Ubuntu Linux 20.04 as ``root`` user:

    .. code-block:: none

      # apt install postgresql postgresql-contrib postgis
      # su postgres -c psql
      postgres=# CREATE ROLE nextgisweb LOGIN PASSWORD 'changeme';
      postgres=# CREATE DATABASE nextgisweb OWNER nextgisweb
      postgres-# ENCODING 'UTF-8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8';
      postgres=# \connect nextgisweb
      nextgisweb=# CREATE EXTENSION postgis;
      nextgisweb=# ALTER TABLE spatial_ref_sys OWNER TO nextgisweb;
      nextgisweb=# ALTER TABLE geography_columns OWNER TO nextgisweb;
      nextgisweb=# ALTER TABLE geometry_columns OWNER TO nextgisweb;
      nextgisweb=# \quit

    Now you can connect ``nextgisweb`` database on ``localhost`` with
    ``nextgisweb`` username and ``changeme`` password.

- Hardware requirements very depend on amount of data and usage, but we
  recommend start from 4 vCPU, 8GB RAM and 250GB HDD (but SSD is much better).

Installation process
--------------------

First you need to install required packages:

.. code-block:: none

  # apt install curl git
  # curl --silent https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | apt-key add - 
  # add-apt-repository --yes --no-update "deb https://deb.nodesource.com/node_20.x nodistro main"
  # curl --silent https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
  # add-apt-repository --yes --no-update "deb https://dl.yarnpkg.com/debian/ stable main"
  # apt update
  # apt install python3 python3-dev python3-virtualenv
  # apt install build-essential libssl-dev libgdal-dev libgeos-dev \
    gdal-bin libxml2-dev libxslt1-dev zlib1g-dev libjpeg-turbo8-dev \
    postgresql-client libmagic-dev nodejs yarn


It's recommended to use separate user (``ngw`` for example) for NextGIS Web
installation. So let's create it:

.. code-block:: none

  # useradd --create-home --home-dir /srv/ngw --shell /bin/bash ngw

Now you can login with this user and go to home (``/srv/ngw``) directory:

.. code-block:: none

  # su ngw
  $ cd

All commands given bellow with ``$`` command prompt should be executed under
``ngw`` user.

Now create a virtualenv directory and activate virtualenv:

.. code-block:: none

  $ virtualenv -p /usr/bin/python3 env
  $ . env/bin/activate

Create a ``package`` directory and clone NextGIS Web repository here:

.. code-block:: none

  $ mkdir package
  $ cd package
  $ git clone https://github.com/nextgis/nextgisweb.git

Keep in mind that ``master`` default branch is development and unstable. So if
you are going to install NextGIS Web in production environment you should use
the latest tagged version:

.. code-block:: none

  $ cd nextgisweb
  $ git checkout $(git tag -l '*.*.*' | tail -1)
  $ git describe --tags
  4.3.2
  $ cd ..

Now install ``nextgisweb`` python package into virtualenv in editable mode and
compile i18n translations:

.. code-block:: none

  $ export SETUPTOOLS_ENABLE_FEATURES=legacy-editable
  $ pip install -e nextgisweb/
  $ nextgisweb-i18n -p nextgisweb compile

Additional NextGIS Web packages such as ``nextgisweb_qgis`` or
``nextgisweb_mapserver`` should be installed into virtualenv here. But they can
have additional system requirements.

Now go to the home directory and create directory structure:

.. code-block:: none

  $ cd
  $ mkdir config data

Create ``config/config.ini`` with following contents:

.. code-block:: ini
  :caption: File ``config/config.ini``

  [core]

  # Database connection settings
  database.host = [database host]
  database.name = [database name]
  database.user = [database user]
  database.password = [database password]

  # File system storage settings
  sdir = /srv/ngw/data

  # To use Russian translation by default uncomment following line
  # locale.default = ru

Then set up ``NEXTGISWEB_CONFIG`` environment variable which points to NextGIS
Web configuration file (instructions about persistent setting are given at the
end of this section):

.. code-block:: none

  $ export NEXTGISWEB_CONFIG=/srv/ngw/config/config.ini

After that, set up Node.js and Yarn project environment with workspaces, and
build necessary files:

.. code-block:: none

  $ nextgisweb jsrealm install
  $ mkdir dist
  $ yarn run build

Now you should initialize database structure with the following command:

.. code-block:: none

  $ nextgisweb initialize_db

After that, you can run builtin HTTP server:

.. code-block:: none

  $ nextgisweb server

Check that your web browser can open ``http://localhost:8080``, and then log in
using the default username ``administrator`` with password ``admin``. Then press
``Ctrl + C`` to halt HTTP server. NextGIS Web is installed and should work
properly, but builtin HTTP server is not suitable for production purposes.

You may also check ``nextgisweb maintenance`` command, which is required to run
periodically. This command cleans up unused data, such as old file uploads.

.. code-block:: none

  $ nextgisweb maintenance

To simplify subsequent steps add virtualenv initialization to ``.bashrc`` file
for ``ngw`` user:

.. code-block:: none

  $ echo ". ~/env/bin/activate" >> ~/.bashrc
  $ echo "export NEXTGISWEB_CONFIG=~/config/config.ini" >> ~/.bashrc

uWSGI
-----

You can use NextGIS Web with any other WSGI-server like ``gunicorn`` but we
use uWSGI in most of deployments. So install to the virtualenv:

.. code-block:: none

  $ pip install uwsgi

Then create ``config/uwsgi.ini`` with following contents:

.. code-block:: ini
  :caption: File ``config/uwsgi.ini``

  [uwsgi]
  http = 0.0.0.0:8080
  master = true
  processes = 4
  lazy-apps = true
  enable-threads = true
  paste = config:%p
  env = NEXTGISWEB_CONFIG=%d/config.ini

  [app:main]
  use = egg:nextgisweb

And run uWSGI web server:

.. code-block:: none

  $ uwsgi --ini config/uwsgi.ini

Now you should be able to connect ``http://localhost:8080/`` with your web
browser. Then press ``Ctrl + C`` to halt HTTP server. Complete setup of uWSGI
for real world production usage is subject for a separate article, so read uWSGI
documentation.

Systemd
-------

To start NextGIS Web with your system you can use systemd-service. Under
``root`` create service file ``/etc/systemd/system/ngw.service`` with the
following contents:

.. code-block:: ini
  :caption: File ``/etc/systemd/system/ngw.service``

  [Unit]
  Requires=network.target
  After=network.target

  [Service]
  WorkingDirectory=/srv/ngw
  ExecStart=/srv/ngw/env/bin/uwsgi --ini config/uwsgi.ini
  User=ngw
  Group=ngw
  Restart=on-failure
  KillSignal=SIGQUIT
  Type=notify
  NotifyAccess=all

  [Install]
  WantedBy=multi-user.target

Also, you may want to periodic execution of ``nextgisweb maintenance``. To
achieve this, create service (``/etc/systemd/system/ngw-maintenance.service``)
and timer (``/etc/systemd/system/ngw-maintenance.timer``) files:

.. code-block:: ini
  :caption: File ``/etc/systemd/system/ngw-maintenance.service``

  [Unit]
  Description=NextGIS Web maintenance task
  Wants=ngw-maintenance.timer

  [Service]
  Type=simple
  WorkingDirectory=/srv/ngw
  Environment="NEXTGISWEB_CONFIG=/srv/ngw/config/config.ini"
  ExecStart=/srv/ngw/env/bin/nextgisweb maintenance
  User=ngw
  Group=ngw

  [Install]
  WantedBy=multi-user.target

.. code-block:: ini
  :caption: File ``/etc/systemd/system/ngw-maintenance.timer``

  [Unit]
  Description=NextGIS Web maintenance timer
  Requires=ngw-maintenance.service

  [Timer]
  OnCalendar=Mon *-*-* 00:30:00
  Unit=ngw-maintenance.service

  [Install]
  WantedBy=multi-user.target

Then reload systemd configuration, enable and start service and timer:

.. code-block:: none

  # systemctl daemon-reload
  # systemctl enable ngw.service ngw-maintenance.timer
  # systemctl start ngw.service ngw-maintenance.timer

Now NextGIS Web will start with your system.
