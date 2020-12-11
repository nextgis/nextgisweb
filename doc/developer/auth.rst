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

To create new user execute following request:

.. http:post:: /api/component/auth/user/

   Request to create new user.

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :<json string display_name: user full name
   :<json string keyname: user login
   :<json string description: user description
   :<json string password: user password
   :>json id: new user identifier
   :statuscode 201: no error

**Example request**:

.. sourcecode:: http

   POST /api/component/auth/user/ HTTP/1.1
   Host: ngw_url
   Accept: */*

   {
      "display_name": "Test user",
      "keyname": "test_user",
      "password":"secret",
      "disabled": false,
      "member_of": [ 5 ]
   }

**Example response**:

.. sourcecode:: json

    {
      "id": 10
    }
    
Get information about existing user with ``id`` returned in previous request:

.. http:get:: /api/component/auth/user/(int:id)

**Example request**:

.. sourcecode:: http

   GET /api/component/auth/user/10 HTTP/1.1
   Host: ngw_url
   Accept: */*

**Example response**:

.. sourcecode:: json

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
 
    DELETE /api/component/auth/user/10
    
To get current user details execute following request:

.. http:post:: /api/component/auth/current_user

   Request to get current user details

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :>json string keyname: user login
   :>json string display_name: user name
   :>json int id: user identifier
   :statuscode 200: no error

**Example response**:

.. sourcecode:: json

    {
        "keyname": "administrator",
        "display_name": "Admin",
        "id": 4
    }

    
Managing groups
===============

To create new group execute following request:

.. http:post:: /api/component/auth/group

   Request to create new group

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
    
        
Automatically creating users
=============================

To self creating user (anonymous user) execute following request:

.. http:post:: /api/component/auth/register

   Request to create new user

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :<json string display_name: user full name
   :<json string keyname: user login
   :<json string description: user description
   :<json string password: user password
   :statuscode 201: no error
   
Administrator can configure anonymous user registration to the specific group
(via setting checkbox on group in administrative user interface).

This feature requires the special section in NGW config file:

.. sourcecode:: config

   [auth]
   register = true

    
Get resource permissions
=========================

Simple output
--------------

To get resource permissions execute following request. Returned json may vary 
depends on resource type.

**The following request returns resource permissions**:

.. http:get:: /api/resource/(int:id)/permission

   Permissions request

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param id: resource identifier
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   GET /api/resource/56/permission HTTP/1.1
   Host: ngw_url
   Accept: */*

**Example response**:

.. sourcecode:: json

    {
        "resource": {
            "read": true,
            "create": true,
            "update": true,
            "delete": true,
            "manage_children": true,
            "change_permissions": true
        },
        "datastruct": {
            "read": true,
            "write": true
        },
        "data": {
            "read": true,
            "write": true
        },
        "metadata": {
            "read": true,
            "write": true
        }
    }

Detailed output
----------------

To get explain how permissions were set execute following request. Returned 
json may vary depends on resource type.

**The following request returns resource permissions explain**:

.. http:get:: /api/resource/(int:id)/permission/explain

   Permissions explain request

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param id: resource identifier
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   GET /api/resource/56/permission/explain HTTP/1.1
   Host: ngw_url
   Accept: */*

**Example response**:

.. sourcecode:: json

    {
        "resource": {
            "read": {
                "result": true,
                "explain": [
                    {
                        "result": true,
                        "resource": {
                            "id": 0
                        },
                        "type": "acl_rule",
                        "acl_rule": {
                            "action": "allow",
                            "principal": {
                                "id": 2,
                                "cls": "user",
                                "keyname": "everyone"
                            },
                            "scope": "resource",
                            "permission": "read",
                            "identity": "",
                            "propagate": true
                        }
                    },
                    {
                        "result": true,
                        "resource": {
                            "id": 3880
                        },
                        "type": "acl_rule",
                        "acl_rule": {
                            "action": "allow",
                            "principal": {
                                "id": 2,
                                "cls": "user",
                                "keyname": "everyone"
                            },
                            "scope": "resource",
                            "permission": "read",
                            "identity": "",
                            "propagate": true
                        }
                    },
                    {
                        "result": true,
                        "resource": {
                            "id": 4232
                        },
                        "type": "requirement",
                        "requirement": {
                            "scope": "resource",
                            "permission": "read",
                            "attr": "parent",
                            "attr_empty": true
                        },
                        "satisfied": true,
                        "explain": {
                            "resource": {
                                "read": {
                                    "result": true,
                                    "explain": [
                                        {
                                            "result": true,
                                            "resource": {
                                                "id": 0
                                            },
                                            "type": "acl_rule",
                                            "acl_rule": {
                                                "action": "allow",
                                                "principal": {
                                                    "id": 2,
                                                    "cls": "user",
                                                    "keyname": "everyone"
                                                },
                                                "scope": "resource",
                                                "permission": "read",
                                                "identity": "",
                                                "propagate": true
                                            }
                                        },
                                        {
                                            "result": true,
                                            "resource": {
                                                "id": 3880
                                            },
                                            "type": "acl_rule",
                                            "acl_rule": {
                                                "action": "allow",
                                                "principal": {
                                                    "id": 2,
                                                    "cls": "user",
                                                    "keyname": "everyone"
                                                },
                                                "scope": "resource",
                                                "permission": "read",
                                                "identity": "",
                                                "propagate": true
                                            }
                                        },
                                        {
                                            "result": true,
                                            "resource": {
                                                "id": 3880
                                            },
                                            "type": "requirement",
                                            "requirement": {
                                                "scope": "resource",
                                                "permission": "read",
                                                "attr": "parent",
                                                "attr_empty": true
                                            },
                                            "satisfied": true,
                                            "explain": {
                                                "resource": {
                                                    "read": {
                                                        "result": true,
                                                        "explain": [
                                                            {
                                                                "result": true,
                                                                "resource": {
                                                                    "id": 0
                                                                },
                                                                "type": "acl_rule",
                                                                "acl_rule": {
                                                                    "action": "allow",
                                                                    "principal": {
                                                                        "id": 2,
                                                                        "cls": "user",
                                                                        "keyname": "everyone"
                                                                    },
                                                                    "scope": "resource",
                                                                    "permission": "read",
                                                                    "identity": "",
                                                                    "propagate": true
                                                                }
                                                            },
                                                            {
                                                                "result": true,
                                                                "resource": {
                                                                    "id": 3880
                                                                },
                                                                "type": "acl_rule",
                                                                "acl_rule": {
                                                                    "action": "allow",
                                                                    "principal": {
                                                                        "id": 2,
                                                                        "cls": "user",
                                                                        "keyname": "everyone"
                                                                    },
                                                                    "scope": "resource",
                                                                    "permission": "read",
                                                                    "identity": "",
                                                                    "propagate": true
                                                                }
                                                            },
                                                            {
                                                                "result": true,
                                                                "resource": {
                                                                    "id": 0
                                                                },
                                                                "type": "requirement",
                                                                "requirement": {
                                                                    "scope": "resource",
                                                                    "permission": "read",
                                                                    "attr": "parent",
                                                                    "attr_empty": true
                                                                },
                                                                "satisfied": true,
                                                                "explain": {
                                                                    "resource": {
                                                                        "read": {
                                                                            "result": true,
                                                                            "explain": [
                                                                                {
                                                                                    "result": true,
                                                                                    "resource": {
                                                                                        "id": 0
                                                                                    },
                                                                                    "type": "acl_rule",
                                                                                    "acl_rule": {
                                                                                        "action": "allow",
                                                                                        "principal": {
                                                                                            "id": 2,
                                                                                            "cls": "user",
                                                                                            "keyname": "everyone"
                                                                                        },
                                                                                        "scope": "resource",
                                                                                        "permission": "read",
                                                                                        "identity": "",
                                                                                        "propagate": true
                                                                                    }
                                                                                },
                                                                                {
                                                                                    "result": true,
                                                                                    "resource": null,
                                                                                    "type": "requirement",
                                                                                    "requirement": {
                                                                                        "scope": "resource",
                                                                                        "permission": "read",
                                                                                        "attr": "parent",
                                                                                        "attr_empty": true
                                                                                    },
                                                                                    "satisfied": false,
                                                                                    "explain": null
                                                                                }
                                                                            ]
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        ]
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            },
            "create": {
                "result": false,
                "explain": [
                    {
                        "result": false,
                        "resource": {
                            "id": 4234
                        },
                        "type": "default"
                    }
                ]
            },
            "update": {
                "result": false,
                "explain": [
                    {
                        "result": false,
                        "resource": {
                            "id": 4234
                        },
                        "type": "default"
                    }
                ]
            },
            "delete": {
                "result": false,
                "explain": [
                    {
                        "result": false,
                        "resource": {
                            "id": 4234
                        },
                        "type": "default"
                    }
                ]
            },
            "manage_children": {
                "result": false,
                "explain": [
                    {
                        "result": false,
                        "resource": {
                            "id": 4234
                        },
                        "type": "default"
                    }
                ]
            },
            "change_permissions": {
                "result": false,
                "explain": [
                    {
                        "result": false,
                        "resource": {
                            "id": 4234
                        },
                        "type": "default"
                    }
                ]
            }
        },
        "datastruct": {
            "read": {
                "result": true,
                "explain": [
                    {
                        "result": true,
                        "resource": {
                            "id": 0
                        },
                        "type": "acl_rule",
                        "acl_rule": {
                            "action": "allow",
                            "principal": {
                                "id": 2,
                                "cls": "user",
                                "keyname": "everyone"
                            },
                            "scope": "datastruct",
                            "permission": "read",
                            "identity": "",
                            "propagate": true
                        }
                    }
                ]
            },
            "write": {
                "result": false,
                "explain": [
                    {
                        "result": false,
                        "resource": {
                            "id": 4234
                        },
                        "type": "default"
                    }
                ]
            }
        },
        "data": {
            "read": {
                "result": true,
                "explain": [
                    {
                        "result": true,
                        "resource": {
                            "id": 0
                        },
                        "type": "acl_rule",
                        "acl_rule": {
                            "action": "allow",
                            "principal": {
                                "id": 2,
                                "cls": "user",
                                "keyname": "everyone"
                            },
                            "scope": "data",
                            "permission": "read",
                            "identity": "",
                            "propagate": true
                        }
                    },
                    {
                        "result": true,
                        "resource": {
                            "id": 4233
                        },
                        "type": "requirement",
                        "requirement": {
                            "scope": "connection",
                            "permission": "connect",
                            "attr": "connection",
                            "attr_empty": false
                        },
                        "satisfied": true,
                        "explain": {
                            "connection": {
                                "connect": {
                                    "result": true,
                                    "explain": [
                                        {
                                            "result": true,
                                            "resource": {
                                                "id": 0
                                            },
                                            "type": "acl_rule",
                                            "acl_rule": {
                                                "action": "allow",
                                                "principal": {
                                                    "id": 2,
                                                    "cls": "user",
                                                    "keyname": "everyone"
                                                },
                                                "scope": "connection",
                                                "permission": "connect",
                                                "identity": "",
                                                "propagate": true
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            },
            "write": {
                "result": false,
                "explain": [
                    {
                        "result": false,
                        "resource": {
                            "id": 4234
                        },
                        "type": "default"
                    }
                ]
            }
        },
        "metadata": {
            "read": {
                "result": true,
                "explain": [
                    {
                        "result": true,
                        "resource": {
                            "id": 0
                        },
                        "type": "acl_rule",
                        "acl_rule": {
                            "action": "allow",
                            "principal": {
                                "id": 2,
                                "cls": "user",
                                "keyname": "everyone"
                            },
                            "scope": "metadata",
                            "permission": "read",
                            "identity": "",
                            "propagate": true
                        }
                    }
                ]
            },
            "write": {
                "result": false,
                "explain": [
                    {
                        "result": false,
                        "resource": {
                            "id": 4234
                        },
                        "type": "default"
                    }
                ]
            }
        }
    }
