Modern JavaScript
=================

From the beginning, the client-side part of NextGIS Web had been based on the
Dojo 1.x framework. It was enough simple and great in terms of modularity in
those times. But times had changed and now we have modern JavaScript which Dojo
1.x doesn't support. And now NextGIS Web is in transition from old-style
Dojo-based code to modern JavaScript with ES modules, Webpack, and lots of other
stuff.

The bad news is that the migration is hard and will take a lot of resources, but
the good news is interoperability between old-style and modern JavaScript
code. Thus you can use modern code from old-style code and vice versa.

The key points are that:

1. Each NextGIS Web component may own one (or even more) corresponding Node
   package, which belongs to the ``@nextgisweb`` scope (even true for NextGIS
   Web extension packages like ``nextgisweb_qgis``). These packages are located
   under ``nodepkg`` subdirectories of corresponding components.

2. These packages are joined into one big Yarn workspace root, and Node packages
   become Yarn workspaces. It looks like working with monorepository on multiple
   libraries but in multiple source code repositories.

3. There is a modular Webpack config on top of that. Some Node packages can
   have their modules, but most of them use the ``main`` Webpack module.

4. Modules that are part of the ``main`` Webpack module should use modern
   ESM module syntax. Webpack compiles them into ES5 compatible modules using
   the Babel compiler.

5. Each Node package can provide one or more entrypoint for the "main" Webpack
   module. These entrypoints are compiled to AMD modules and can be loaded by
   Dojo AMD loader on the client-side.

On the side of NextGIS Web, the ``jsrealm`` component manages this enviroment and
provides some tools to work with that.

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

Let's say we have the following directory structure for component ``bar`` which
already has Dojo-based JavaScript code in ``bar/amd/ngw-bar`` directory:

.. code-block:: text

  🗁 ~ngw/package/nextgisweb_foo/nextgisweb_foo/bar
  ├── 🗁 amd
  │   └── 🗁 ngw-bar
  │       ├── 🗎 module-one.js
  │       └── 🗎 module-two.js
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
  ├── 🗀 amd
  ├── 🗁 nodepkg
  │   └── 🗎 package.json
  └── 🗎 __init__.py

Let's include this package into Yarn workspace root configuration:

.. code-block:: bash

  $ cd ~ngw
  $ nextgisweb jsrealm.install

And now you can add some external dependecy for this package, for example:

.. code-block:: bash

  $ cd ~ngw
  $ yarn workspace "@nextgisweb/bar" add faker

Then you can see that dependecy was added to ``package.json`` and now
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

  require(["@nextgisweb/bar/entrypoint"], function (entrypoint) {
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

2. Automatic chunk generation and loading with Dojo AMD loader.

3. Support of CSS imports like :code:`import "./resource.css"`.

The ``external`` module delivers prebuilt libraries which are primarily used by
old-style JavaScript code. Dojo  (``dojo``, ``dijit``, ``dojox``), ``dgrid``,
``codemirror``, etc. libraries are delivered by this module. Before NextGIS Web
was integrated with Webpack and Node, these libraries were included in NextGIS
Web source tree.

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
preferred in dependencies. For example, use ``lodash-es`` instead of ``lodash``
with granular imports:

.. code-block:: javascript

  // Right way
  import { set } from "lodash-es/set";
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

Code formatting
^^^^^^^^^^^^^^^
  
In NextGIS Web core and extension packages the following formatting rules are
used:

1. 4 space indentation - it matches Python PEP8 indentation and is also used in
   old-style JavaScript, Mako templates, etc.
2. Double quotes for string literals.
3. 80 characters column limit.

.. note::

  There is a planned adoption of some code formatter like Prettier. So don't
  spend time carefully formatting the code it will be autoformatted sometime.

Interoperability
----------------

It's possible to import old-style libraries from modern ones:

.. code-block:: javascript

  import { default as Dialog } from "dijit/Dialog";
  import { add, remove } from "dojo/dom-class";

And from old-style import entrypoints based on modern ones. As in the example
above:

.. code-block:: javascript

  define(["@nextgisweb/bar/entrypoint"], function (entrypoint) {
      entrypoint.greet();
  });

