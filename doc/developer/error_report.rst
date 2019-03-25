.. sectionauthor:: Dmitry Baryshnikov <dmitry.baryshnikov@nextgis.ru>

Error reporting
===============

If request failed, error code will be in HTTP header and error description text
in JSON of response body.

**Example response**:

.. sourcecode:: http

   HTTP/1.1 403 Forbidden
   Server: nginx/1.4.6 (Ubuntu)
   Date: Sun, 21 Sep 2014 00:05:31 GMT
   Content-Type: application/json; charset=UTF-8
   Content-Length: 44
   Connection: keep-alive

   {"message": "Attribute 'keyname' forbidden"}

In some cases the html text or empty body may returned. For example, if
internal server error occurred, HTTP status code set to 500 and html text returns.
