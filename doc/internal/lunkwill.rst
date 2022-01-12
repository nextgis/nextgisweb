Long-running API requests
=========================

Some HTTP API requests to NextGIS Web, such as raster layer creation, need
processing a lot of data. Thus, they may require some time to proceed. But HTTP
isn't designed to handle requests which last for minutes or hours. The
``lunkwill`` extension helps to cope with this kind of requests.

The extension acts as a proxy between an uWSGI application and a client and
allows to avoid long-lasting connections while a request proceeds. It requires
the proprietary ``lunkwill`` add-on which integrates into uWSGI stack as a
sidecar mule.

A typical conversation with ``lunkwill`` extension enabled looks like the
following:

.. code-block:: text

  > POST /api/resource/
  > X-Lunkwill: suggest
  > 
  > (JSON payload)
  
  < 201 Created
  < Content-Type: application/vnd.lunkwill.request-summary+json; charset=utf-8
  <
  < {
  <   "id": "92f6317d-c2e9-4c47-a6dd-b87898d9f8f4",
  <   "status": "processing",
  <   "delay_ms": 50,
  <   "retry_ms": 2000
  < }

The client adds ``X-Lunkwill`` HTTP header with ``suggest`` value, which
indicates that the client supports the extension. The extension intercepts
requests with the header and returns its ID and status with the specific
MIME-type ``application/vnd.lunkwill.request-summary+json``. If there's no
``lunkwill`` extension, the header will be ignored and the request will be
processed as usual.

Then the client should ask for a request summary in ``delay_ms`` microseconds
and the server will return the current status. And repeat until status changes.
If there aren't such summary requests, the server will eventually cancel the
request.

.. code-block:: text

  > GET /api/lunkwill/92f6317d-c2e9-4c47-a6dd-b87898d9f8f4/summary
  
  < 200 OK
  < Content-Type: application/vnd.lunkwill.request-summary+json; charset=utf-8
  <
  < {
  <   "id": "92f6317d-c2e9-4c47-a6dd-b87898d9f8f4",
  <   "status": "processing",
  <   "delay_ms": 200,
  <   "retry_ms": 2000
  < }

Besides ``delay_ms`` attribute, the server advertises ``retry_ms`` attribute
which should be used as a retry delay if a summary request fails (network
connectivity problems etc.).

As the request completes, it'll have ``ready`` status:

.. code-block:: text

  > GET /api/lunkwill/92f6317d-c2e9-4c47-a6dd-b87898d9f8f4/summary
  
  < 200 OK
  < Content-Type: application/vnd.lunkwill.request-summary+json; charset=utf-8
  <
  < {
  <   "id": "92f6317d-c2e9-4c47-a6dd-b87898d9f8f4",
  <   "status": "ready",
  <   "delay_ms": 4000,
  <   "retry_ms": 2000
  < }

After that the client must request the response:

.. code-block:: text

  > GET /api/lunkwill/92f6317d-c2e9-4c47-a6dd-b87898d9f8f4/response
  
  < 201 OK
  < Content-Type: application/json
  <
  < {
  <   "id": 82,
  <   "parent": {
  <     "id": 0
  <   }
  < }

This response matches the original NextGIS Web response as if it was processed
without ``lunkwill`` extension.
