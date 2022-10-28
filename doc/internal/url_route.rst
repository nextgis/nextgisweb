URLs and routes
===============

This document summarizes the current URL and route naming conventions. These
rules are taken into account in some parts of backend and frontend logic (CORS,
client-side routes).

URLs
----

URLs are split into three categories:

* API URLs - accessed by the fronted and libraries.
* Static URLs - used to serve static content.
* User URLs - viewed by users in browsers.

API URLs:

1. Start with ``/api/`` prefix.
2. If bound to a specific resource, ``/api/resource/{id}/`` prefix is used.
3. For the rest, ``/api/component/{component}/`` prefix is used.
4. Use snake case (``/api/component/auth/current_user`` for example).
5. Collections must use singular forms and the trailing slash
   (``/api/resource/{id}/feature/`` for features of resource).
6. Collection items mustn't use the trailing slash.

Static URLs:

1. Start with ``/static/{static_key}/`` prefix (``{static_key}`` is unique for
   each build and used for cache invalidation on caching proxies).

User URLs:

1. Use kebab case (``/control-panel`` for example).
2. Prefix ``/resource/{id}/`` is used if bound to a specific resource.

Route names
-----------

Pyramid route names:

1. Start with ``{component}.`` prefix.
2. Use snake case (``pyramid.control_panel`` for example).