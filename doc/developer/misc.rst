.. sectionauthor:: Dmitry Baryshnikov <dmitry.baryshnikov@nextgis.ru>

Miscellaneous
=============

Get resource data
-----------------

Geodatata can be fetched for vector and raster layers. For vector layers
(PostGIS and Vector) geodata returns in :term:`GeoJSON` or :term:`CSV` formats.
For raster layers (Raster, :term:`WMS`) - tiles (:term:`TMS`:) or image.
For QGIS styles - qml file.

GeoJSON
^^^^^^^

**The following request returns GeoJSON file from vector layer**:

.. deprecated:: 2.2
.. http:get:: /resource/(int:id)/geojson/

.. versionadded:: 3.0
.. http:get:: /api/resource/(int:id)/geojson

   GeoJSON file request

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param id: resource identifier
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   GET /api/resource/55/geojson HTTP/1.1
   Host: ngw_url
   Accept: */*

CSV
^^^

**The following request returns CSV file from vector layer**:

.. versionadded:: 3.0
.. http:get:: /api/resource/(int:id)/csv

   CSV file request

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param id: resource identifier
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   GET /api/resource/55/csv HTTP/1.1
   Host: ngw_url
   Accept: */*

TMS
^^^

**The following request returns TMS from raster layer**:

.. deprecated:: 2.2
.. http:get:: /resource/(int:id)/tms?z=(int:z)&x=(int:x)&y=(int:y)

.. versionadded:: 3.0
.. http:get:: /api/component/render/tile?z=(int:z)&x=(int:x)&y=(int:y)&resource=(int:id1),(int:id2)...

    Tile request

    :reqheader Accept: must be ``*/*``
    :reqheader Authorization: optional Basic auth string to authenticate
    :param id1, id2: style resources id's
    :param z: zoom level
    :param x: tile number on x axis (horizontal)
    :param y: tile number on y axis (vertical)
    :statuscode 200: no error

.. note:: Styles order should be from lower to upper.

**Example request**:

.. sourcecode:: http

   GET /api/component/render/tile?z=7&x=84&y=42&resource=234 HTTP/1.1
   Host: ngw_url
   Accept: */*

QML Style (QGIS Layer style)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

**The following request returns QML from QGIS style**:

.. versionadded:: 3.0.1
.. http:get:: /api/resource/(int:id)/qml

   QML file request

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param id: resource identifier
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   GET /api/resource/56/qml HTTP/1.1
   Host: ngw_url
   Accept: */*

MVT (vector tiles)
^^^^^^^^^^^^^^^^^^^

MVT data can be fetched only for NextGIS Web vector layer.

**The following request returns MVT data**:

.. versionadded:: 3.0.4
.. http:get:: /api/component/feature_layer/mvt?x=(int:x)&y=(int:y)&z=(int:z)&resource=(int:id1),(int:id2)...&simplification=(int:s)

    Vector tile request

    :reqheader Accept: must be ``*/*``
    :reqheader Authorization: optional Basic auth string to authenticate
    :param id1, id2: Vector or PostGIS layers identifies
    :param z: zoom level
    :param x: tile number on x axis (horizontal)
    :param y: tile number on y axis (vertical)
    :param s: simplification level (0 - no simplification, 8 - default value)
    :statuscode 200: no error

.. note:: Vector or PostGIS layers identifies order should be from lower to upper. 

Layers names in MVT will be `ngw:(int:id)`, where id is vector or PostGIS layer identifier. 

**Example request**:

.. sourcecode:: http

   GET /api/component/feature_layer/mvt?resource=56&z=11&x=1234&y=543 HTTP/1.1
   Host: ngw_url
   Accept: */*

.. deprecated:: 3.0.4
.. http:get:: /api/resource/(int:id)/(int:z)/(int:x)/(int:y).mvt

   MVT request

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param id: resource identifier
   :param z:  zoom level
   :param x:  x tile column
   :param y:  y tile row
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   GET /api/resource/56/11/1234/543.mvt HTTP/1.1
   Host: ngw_url
   Accept: */*

Get resource permissions
------------------------

To get resource permissions execute following request. Returned json may vary depends on resource type.

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


User management
---------------

To get user description by it identifier execute following request:

.. versionadded:: 2.3
.. http:get:: /api/component/auth/user/(int:id)

**Example request**:

.. sourcecode:: http

   GET /api/component/auth/user/4 HTTP/1.1
   Host: ngw_url
   Accept: */*

**Example response**:

.. sourcecode:: json

    {
      "description": null,
      "disabled": false,
      "display_name": "\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440",
      "id": 4,
      "keyname": "administrator",
      "member_of": [
        5
      ],
      "superuser": false,
      "system": false
    }

To create new user execute following request:

.. versionadded:: 2.3
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
     "description": null,
     "display_name": "another test",
     "keyname": "test1",
     "password": "test123"
   }

**Example response**:

.. sourcecode:: json

    {
      "id": 4
    }

To create new group execute following request:

.. versionadded:: 2.3
.. http:post:: /api/component/auth/group

   Request to create new group

To self create user (anonymous user) execute following request:

.. versionadded:: 2.3
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
        "display_name": "Администратор",
        "id": 4
    }

Identify by polygon
-------------------------

To get features intersected by a polygon execute following request.

.. http:put:: /feature_layer/identify

   Identification request

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :<json int srs: Spatial reference identifier
   :<json string geom: Polygon in WKT format
   :<jsonarr int layers: layers id array
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   POST /feature_layer/identify HTTP/1.1
   Host: ngw_url
   Accept: */*

   {
       "srs":3857,
       "geom":"POLYGON((4188625.8318882 7511123.3382522,4188683.1596594 7511123.
                        3382522,4188683.1596594 7511180.6660234,4188625.8318882
                        7511180.6660234,4188625.8318882 7511123.3382522))",
       "layers":[2,5]
   }

**Example response**:

.. sourcecode:: json

    {
      "2": {
        "featureCount": 1,
        "features": [
          {
            "fields": {
              "Id": 25,
              "name": "\u0426\u0435\u0440\u043a\u043e\u0432\u044c \u0412\u0432
                       \u0435\u0434\u0435\u043d\u0438\u044f \u041f\u0440\u0435
                       \u0441\u0432\u044f\u0442\u043e\u0439 \u0411\u043e\u0433
                       \u043e\u0440\u043e\u0434\u0438\u0446\u044b \u0432\u043e
                       \u0425\u0440\u0430\u043c \u043d\u0430 \u0411\u043e\u043b
                       \u044c\u0448\u043e\u0439 \u041b\u0443\u0431\u044f\u043d
                       \u043a\u0435, 1514-1925"
            },
            "id": 3,
            "label": "#3",
            "layerId": 2
          }
        ]
      },
      "5": {
        "featureCount": 0,
        "features": []
      },
      "featureCount": 1
    }
