.. sectionauthor:: Dmitry Baryshnikov <dmitry.baryshnikov@nextgis.ru>

Authentication
==============

For the authorisation a POST request the following form sent.

.. http:post:: /login

   Authentication request to NextGIS Web

   :form login: Login
   :form password: Password
   :status 200: Success authentication
   
   
**Example request**:
    
.. sourcecode:: http
 
   POST /login
   Host: ngw_url
   Accept: */*

   login=<login>&password=<password>

If authorisation success NextGIS Web return HTTP code 200 and Set-Cookie. 
If set this cookie into the request header, this request will be authorised.

Also, in each request may be send authorised data (HTTP AUTH).

.. note::
    
    When the user agent wants to send the server authentication credentials it 
    may use the Authorization header.

    The Authorization header is constructed as follows:

        1. Username and password are combined into a string "username:password"
        2. The resulting string is then encoded using the RFC2045-MIME variant of Base64, except not limited to 76 char/line
        3. The authorization method and a space i.e. "Basic " is then put before the encoded string.

    For example, if the user agent uses 'Aladdin' as the username and 'open 
    sesame' as the password then the header is formed as follows:

    Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==

