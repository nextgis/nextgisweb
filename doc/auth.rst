.. sectionauthor:: Дмитрий Барышников <dmitry.baryshnikov@nextgis.ru>

Authentication
==============

Для авторизации необходимо послать POST запрос следующего вида. 

.. http:post:: /login

   Запрос на авторизацию в NextGIS Web

   :form login: Login
   :form password: Password
   :status 200: Success authentication
   
   
**Пример запроса**:
    
.. sourcecode:: http
 
   POST /login
   Host: ngw_url
   Accept: */*

   login=<login>&password=<password>

При успешной аутентификации возвращается ответ с кодом 200 и Set-Cookie. Если подставлять cookie в следующие запросы, то пользователь будет считаться аутентифицированным.

Кроме того, в каждом запросе можно передавать аутентификационные данные (HTTP AUTH).

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

