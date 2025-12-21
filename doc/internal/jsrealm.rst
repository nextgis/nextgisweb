Modern JavaScript
=================

Previously NextGIS Web client-side was based on Dojo 1.x framework and AMD
modules, but now everything is based on up-to-date JavaScript with ES modules
and Webpack. The key points:

1. Each NextGIS Web component may own one (or more) corresponding Node
   package, which belongs to the ``@nextgisweb`` scope (true for NextGIS
   Web extension packages like ``nextgisweb_qgis``). These packages are located
   under ``nodepkg`` subdirectories of corresponding components.

2. These packages are joined into one big Yarn workspace root, and Node packages
   become Yarn workspaces. It looks like working with monorepository on multiple
   libraries but in multiple source code repositories.

3. There is a modular Webpack config on top of that. Some Node packages can
   have their modules, but most of them use the ``main`` Webpack module.

On the NextGIS Web side, the ``jsrealm`` component manages this enviroment and
provides some tools to work with it.

Setup and directory layout
--------------------------

Yarn workspaces feature depends on directory layout. In the examples below, we
assume that NextGIS Web is installed into home directory of ``ngw`` user with
the following layout (some files are not shown):

.. code-block:: text

  🗁 ~ngw
  ├── 🗀 env
  ├── 🗀 data
  ├── 🗀 config
  └── 🗁 package
      ├── 🗀 nextgisweb
      └── 🗁 nextgisweb_foo
          ├── 🗁 nextgisweb_foo
          │   └── 🗀 bar
          └── 🗎 setup.py


Working with packages
---------------------

Let's say we have the following directory structure for component ``bar``:

.. code-block:: text

  🗁 ~ngw/package/nextgisweb_foo/nextgisweb_foo/bar
  └── 🗎 __init__.py

To add ``bar`` package you should create ``bar/nodepkg`` directory and
``bar/nodepkg/package.json`` file with the following content:

.. code-block:: json

  {
      "name": "@nextgisweb/bar",
      "version": "0.0.0",
      "type": "module"
  }

NextGIS Web component identifiers use ``snake_case``, but ``kebab-case`` is
preferred in the JavaScript ecosystem and we shouldn't break this convention. So
if a component identifier consists of two or more words, it should be converted
in Node package name. Thus ``file_upload`` NextGIS Web component becomes
``@nextgisweb/file-upload`` in Node package.

.. note::

  Version ``0.0.0`` may seem strange, but any Node package is required to have a
  version. Versions are managed on NextGIS Web package level and we don't plan
  to publish this package on NPM.

After that it will look like this:
  
.. code-block:: text

  🗁 ~ngw/package/nextgisweb_foo/nextgisweb_foo/bar
  ├── 🗁 nodepkg
  │   └── 🗎 package.json
  └── 🗎 __init__.py

Let's include this package into Yarn workspace root configuration:

.. code-block:: bash

  $ cd ~ngw
  $ nextgisweb jsrealm install

And now you can add some external dependency for this package, for example:

.. code-block:: bash

  $ cd ~ngw
  $ yarn workspace "@nextgisweb/bar" add faker

Then you can see that dependency was added to ``package.json`` and now
``bar/nodepkg/package.json`` looks like this:

.. code-block:: json

  {
      "name": "@nextgisweb/bar",
      "version": "0.0.0",
      "type": "module",
      "dependencies": {
          "faker": "^5.5.3"
      }
  }

Now let's add an entrypoint and use the ``faker`` library from it. Create file
``bar/nodepkg/entrypoint.js`` with the following content:

.. code-block:: javascript

  /** @entrypoint */
  import faker from "faker";

  export function greet() {
      console.log(`Hello, ${faker.name.findName()}!`);
  }
  export function lorem() {
      console.log(faker.lorem.paragraph());
  }

The most important thing in the example is the ``/** @entrypoint */``, which
tells the ``main`` Webpack module to create a separate library from this file.
Now build Webpack bundles and start development webserver:

.. code-block:: bash

  $ cd ~ngw
  $ yarn run build
  $ nextgisweb server

Then go to ``http://localhost:8080/`` open console in web developer tools and
execute the following expression:

.. code-block:: javascript

  ngwEntry("@nextgisweb/bar/entrypoint").then(function (entrypoint) {
      entrypoint.greet();
      entrypoint.lorem();
  })

And you will see something like this:

.. code-block:: text

  Hello, Stephen Hagenes!
  Nobis porro officiis natus id ex hic blanditiis
  commodi tenetur. Sint sed et voluptatibus ratione non quo natus. Odio dolorem
  ipsum sapiente dolores autem modi. Deleniti eos possimus minima vitae dolore.

If you look at network requests, you will see how the browser loads entrypoint
and their chunks:

.. code-block:: text

  GET .../main/@nextgisweb/bar/entrypoint.js          [HTTP/1.1 200 OK  2ms]
  GET .../main/chunk/vendors-...-eb4fd9.js            [HTTP/1.1 200 OK  3ms]
  GET .../main/chunk/vendors-...-faker_index_js.js    [HTTP/1.1 200 OK 27ms]

Webpack modules
---------------

The ``main`` Webpack module which collects entrypoints from NextGIS Web
component packages provides the following features:

1. Compilation of modules to browser-compatible format using the Babel and
   CoreJS libraries.

2. Support of CSS imports like :code:`import "./resource.css"`.

The ``stylesheet`` module delivers compiled Less stylesheets and some fonts
which are installed from NPM registry. Previously fonts were also included in
the source tree.

It's possible to provide additional Webpack modules. They can be declared under
``nextgisweb.webpackConfigs`` in ``package.json``. Here is the example from
``@nextgisweb/stylesheet`` Node package:

.. code-block:: json

  {
      "nextgisweb": {
          "webpackConfigs": {
              "stylesheet": "webpack.stylesheet.cjs"
          }
      }
  }

Writing modules
---------------

All modules should be written as ES modules. ES versions of libraries should be
preferred in dependencies. For example, use ``lodash-es`` instead of ``lodash``:

.. code-block:: javascript

  // Right way
  import { set } from "lodash-es";
  set(...);

  // Wrong way
  import lodash from "lodash";
  lodash.set(...);


Dynamic imports
^^^^^^^^^^^^^^^

In general dynamic imports work correctly and on-demand chunks are created. Then
this code will produce an additional on-demand chunk:

.. code-block:: javascript

  async function doSomething() {
      const dynamic = await import("./some-module");
  }

But it works until demanded module becomes an entrypoint. After that, it starts
being a required chunk, not on-demand. This issue can be solved with the
auxiliary module ``@nextgisweb/jsrealm/entrypoint``, which uses AMD require
machinery and also supports expressions in module names:

.. code-block:: javascript
  
  import entrypoint from "@nextgisweb/jsrealm/entrypoint";
  
  async function doSomething() {
      // NOTE: This method doesn't support relative entrypoint names!
      const dynamic = await entrypoint("@nextgisweb/bar/some-module");
  }
