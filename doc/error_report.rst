.. sectionauthor:: Дмитрий Барышников <dmitry.baryshnikov@nextgis.ru>

Error reporting
===============

Если в результате запроса была получена ошибка, то код ошибки передается в HTTP 
коде, а текст в виде JSON в теле ответа.

**Example response**:
    
.. sourcecode:: http

   HTTP/1.1 403 Forbidden
   Server: nginx/1.4.6 (Ubuntu)
   Date: Sun, 21 Sep 2014 00:05:31 GMT
   Content-Type: application/json; charset=UTF-8
   Content-Length: 44
   Connection: keep-alive

   {"message": "Attribute 'keyname' forbidden"}

