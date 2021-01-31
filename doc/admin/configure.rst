Configuration
=============

There are two ways to configure NextGIS Web exist:

1. Configuration files.
2. Environment variables.

.. note::

  Don't forget to restart NextGIS Web after changes. They don't affect
  configuration until NextGIS Web restart.

Cofiguration files
------------------

Configuration files were mentioned in the Install section. They follow ini-style
syntax and consist of ``environment`` section and per-component sections.

The ``environment`` section configures packages, components, and logging, for
example:

.. code-block:: ini

  [environment]

  package.nextgisweb_basemap = false
  compoent.social = false

Component sections configure component specific options, for example:

.. code-block:: ini

  [file_upload]

  max_size = 8589934592
  tus.enabled = true

The list of possible options and configuration file template can be obtained
using the ``nextgisweb-config`` command:

.. code-block:: bash

  $ nextgisweb-config environment  # For environment section
  $ nextgisweb-config sentry       # For sentry component
  $ nextgisweb-config              # All available options
  
The output example is given below. You can copy this template and uncomment
needed options, which start with a semi-colon.

.. code-block:: ini

  ### Component 'file_upload'
  [file_upload]

  ## Option: max_size (integer) (default: 8589934592)
  ; max_size = 8589934592

  ## Option: tus.enabled (boolean) (default: true)
  ; tus.enabled = true

  ## Option: tus.chunk_size.default (integer) (default: 16777216)
  ; tus.chunk_size.default = 16777216

  ## Option: tus.chunk_size.minimum (integer) (default: 1048576)
  ; tus.chunk_size.minimum = 1048576

It's possible to store all configuration in one file or use multiple files. To
point NextGIS Web to a specific configuration file, the environment variable
``NEXTGISWEB_CONFIG``  is used or the ``--config`` command-line option (when
applicable). The ``--config`` option takes priority over the
``NEXTGISWEB_CONFIG`` environment variable. So when the ``--config`` option is
given, the ``NEXTGISWEB_CONFIG`` environment variable will be ignored.

Multiple configuration files can be separated by a colon, and they are merged
during the load.

.. code-block:: bash
  
  # NEXTGISWEB_CONFIG environment variable
  $ export NEXTGISWEB_CONFIG=some/config.ini:other/config.ini

  # Or --config command-line option
  $ nextgisweb --config some/config.ini:other/config.ini ...

The last file has more priority than the first one. If some option is used by
both (the first and the last one) files, and only value from the last one will
be used.

Environment variables
---------------------

Another way to configure NextGIS Web is using environment variables. It's
interchangeable with configuration files, and everything that can be configured
with configuration files also can be configured using environment variables.

The conversion rules are quite simple:

* Variable names follow the template:

  * ``NEXTGISWEB__ENVIRONMENT__KEY`` for ``environment`` section.
  * ``NEXTIGSWEB__COMPONENT__KEY`` for component options.

* All component names and keys are in upper case, and dots are replaced with two
  underscores (``__``).

In this way, the following configuration file and environment variables are equivalent.

.. code-block:: ini

  [some_component]
  first.key = foo
  second.key = bar

.. code-block:: bash

  NEXTGISWEB__SOME_COMPONENT__FIST__KEY=foo
  NEXTGISWEB__SOME_COMPONENT__SECOND__KEY=bar

The ``nextgisweb-config`` can generate the template in environment variables
format using option ``--env-vars``. For example, command ``nextgisweb-config
--env-vars file_upload`` will generate something like this:

.. code-block:: bash

  ### Component 'file_upload'

  ## Option: max_size (integer) (default: 8589934592)
  # NEXTGISWEB__FILE_UPLOAD__MAX_SIZE=8589934592

  ## Option: tus.enabled (boolean) (default: true)
  # NEXTGISWEB__FILE_UPLOAD__TUS__ENABLED=true

  ## Option: tus.chunk_size.default (integer) (default: 16777216)
  # NEXTGISWEB__FILE_UPLOAD__TUS__CHUNK_SIZE__DEFAULT=16777216

  ## Option: tus.chunk_size.minimum (integer) (default: 1048576)
  # NEXTGISWEB__FILE_UPLOAD__TUS__CHUNK_SIZE__MINIMUM=1048576

