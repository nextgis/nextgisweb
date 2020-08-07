.. sectionauthor:: Dmitry Baryshnikov <dmitry.baryshnikov@nextgis.ru>

Authorization
==============

Send the following POST request to get authorization cookie.

.. http:post:: /login

   Authorization request to NextGIS Web

   :form login: Login
   :form password: Password
   :status 200: Success authorization
   
   
**Example request**:
    
.. sourcecode:: http
 
   POST /login
   Host: ngw_url
   Accept: */*

   login=<login>&password=<password>

If authorization succeeds, NextGIS Web will return HTTP code 200 and Set-Cookie. 
Requests with this cookie into the header will be considered authorized.

Authorized data (HTTP AUTH) can be sent with each request.

.. note::   
    When the user agent wants to send the server authentication credentials it 
    may use the Authorization header.

    The Authorization header is constructed as follows:

        1. Username and password are combined into a string "username:password"
        2. The resulting string is then encoded using the RFC2045-MIME variant of Base64, except not limited to 76 char/line
        3. The authorization method and a space i.e. "Basic " is then put before the encoded string.

    For example, if the user agent uses 'Aladdin' as the username and 'open 
    sesame' as the password then the header is formed as follows:

    ``Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==``


Managing users
==============

Create new user:
    
.. sourcecode:: http
 
    POST /api/component/auth/user/

    {
      "display_name": "Test user",
      "keyname": "test_user",
      "password":"secret",
      "disabled": false,
      "member_of": [ 5 ]
    }

Get information about existing user with ``id`` returned in previous request:

.. sourcecode:: http
 
    GET /api/component/auth/user/10

    {
      "id": 10,
      "system": false,
      "display_name": "Test user",
      "description": null,
      "keyname": "test_usera",
      "superuser": false,
      "disabled": false,
      "last_activity": null,
      "oauth_subject": null,
      "oauth_tstamp": null,
      "member_of": [ 5 ]
    }

Update user details:

.. sourcecode:: http
 
    PUT /api/component/auth/user/10

    {
      "display_name": "Dear test user",
      "disabled": true
    }


Get information about all local users in WebGIS (some output was clipped):

.. sourcecode:: http
 
    GET /api/component/auth/user/

    [
      // ...
      {
        "id": 4,
        "system": false,
        "display_name": "Administrator",
        "description": null,
        "keyname": "administrator",
        "superuser": false,
        "disabled": false,
        "last_activity": "2020-08-07T01:27:52.870601",
        "oauth_subject": null,
        "oauth_tstamp": null,
        "member_of": [ 5 ]
      },
      {
        "id": 6,
        "system": true,
        "display_name": "Owner",
        "description": null,
        "keyname": "owner",
        "superuser": false,
        "disabled": false,
        "last_activity": null,
        "oauth_subject": null,
        "oauth_tstamp": null,
        "member_of": []
      },
      // ...
      {
        "id": 10,
        "system": false,
        "display_name": "Dear test user",
        "description": null,
        "keyname": "test_usera",
        "superuser": false,
        "disabled": true,
        "last_activity": null,
        "oauth_subject": null,
        "oauth_tstamp": null,
        "member_of": [ 5 ]
      }
    ]

Delete previously created user:

.. sourcecode:: http
 
    DETELE /api/component/auth/user/10


Managing groups
===============

Create a new group:

.. sourcecode:: http
 
    POST /api/component/auth/group/

    {
      "display_name": "Test group",
      "keyname": "test_group",
      "members": [ 10 ]
    }
    
Get information about existing group:

.. sourcecode:: http

    GET /api/component/auth/group/20

    {
      "id": 20,
      "system": false,
      "display_name": "Test group",
      "description": null,
      "keyname": "test_group",
      "register": false,
      "members": [ 10 ]
    }

Update group details and remove all members from it:

.. sourcecode:: http
 
    PUT /api/component/auth/group/20

    {
      "display_name": "Empty group",
      "members": []
    }

Delete group:

.. sourcecode:: http

    DELETE /api/component/auth/group/20