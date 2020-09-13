.. sectionauthor:: Dmitry Baryshnikov <dmitry.baryshnikov@nextgis.ru>

Editing
==============

Change resource
-----------------

Execute following PUT request to change resource.

.. http:put:: /api/resource/(int:id)

   Change resource request

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param id: resource identifier
   :<json jsonobj resource: resource JSON object
   :<json string display_name: resource new name
   :<json string keyname: resource new key
   :<json int id: resource new parent identifier (resource will move to new parent)
   :<json string description: resource new description
   :<json jsonarr permissions: resource permissions array
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   PUT /api/resource/8 HTTP/1.1
   Host: ngw_url
   Accept: */*

   {"resource":
      {
          "display_name":"test3",
          "keyname":"qw4",
          "parent":{"id":7},
          "permissions":[],
          "description":"rrr5"
       }
   }


.. note::
   Payload of this request may be equal to create new resource request payload,
   but some fields can be omitted. Request must be authorized.
   
**Move resource in terminal**:

.. sourcecode:: bash

   url='https://sandbox.nextgis.com'
   login='administrator'
   password='demodemo'
   
   curl -d '{"resource":{"parent":{"id":373}}}' -u $login:$password -X PUT $url/api/resource/381



Change metadata
-----------------------------

This query create metadata fields, or updating it if they exists.

**Example request**:

.. sourcecode:: http

   PUT /api/resource/8 HTTP/1.1
   Host: ngw_url
   Accept: */*

   {
      "resmeta":{
         "items":{
            "UPDATED_AT":"2018-11-07 14:00",
            "CHECKED_AT":"2018-11-07 12:00"
         }
      }
   }

   Same steps with curl:

.. sourcecode:: bash

   curl --user "user:password" -H 'Accept: */*' -X PUT -d '{"resmeta": {"items":{"UPDATED_AT":"2018-11-07 14:00", "CHECKED_AT":"2018-11-07 12:00"}}}' http://<ngw url>/api/resource/(int:id)


Change file bucket resource
-----------------------------

To change file bucket execute following PUT request:

.. http:put:: /api/resource/(int:id)

   Change file bucket request.

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param id: resource identifier
   :<json jsonobj resource: resource JSON object
   :<json string cls: type (must be ``file_bucket``, for a list of supported types see :ref:`ngwdev_resource_classes`)
   :<json jsonobj parent:  parent resource json object
   :<json int id: parent resource identifier
   :<json string display_name: name
   :<json string keyname: key (optional)
   :<json string description: description text, HTML supported (optional)
   :<json jsonobj file_bucket: file bucket JSON object
   :<json jsonarr files: array of files should present in bucket: present (which need to delete don't include in array), also new files (upload response JSON object, files == upload_meta)
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   PUT /api/resource/22 HTTP/1.1
   Host: ngw_url
   Accept: */*

    {
      "file_bucket": {
        "files": [
          {
            "mime_type": "application/x-dbf",
            "name": "grunt_area_2_multipolygon.dbf",
            "size": 36607
          },
          {
            "mime_type": "application/x-esri-shape",
            "name": "grunt_area_2_multipolygon.shp",
            "size": 65132
          },
          {
            "mime_type": "application/x-esri-shape",
            "name": "grunt_area_2_multipolygon.shx",
            "size": 1324
          },
          {
            "id": "fb439bfa-1a63-cccc-957d-ae57bb5eb67b",
            "mime_type": "application/octet-stream",
            "name": "grunt area description.txt",
            "size": 50
          }
        ]
      },
      "resource": {
        "cls": "file_bucket",
        "description": "some new text",
        "display_name": "new grunt_area",
        "keyname": null,
        "parent": {
          "id": 0
        }
      }
    }

In this example, file *grunt area description.txt* will added, files
*grunt_area_2_multipolygon.cpg*, *grunt_area_2_multipolygon.prj* - deleted,
and bucket name and description will changed.

Change lookup table resource
-----------------------------

To change flookup table execute following PUT request:

.. http:put:: /api/resource/(int:id)

   Change lookup table request.

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param id: resource identifier
   :<json jsonobj resource: resource JSON object
   :<json string cls: type (must be ``lookup_table``, for a list of supported types see :ref:`ngwdev_resource_classes`)
   :<json int id: parent resource identifier
   :<json string display_name: name
   :<json string keyname: key (optional)
   :<json string description: description text, HTML supported (optional)
   :<json jsonobj resmeta: metadata JSON object. Key - value JSON object struct.
   :<json jsonobj lookup_table: lookup table values JSON object. Key - value JSON object struct.
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   PUT /api/resource/22 HTTP/1.1
   Host: ngw_url
   Accept: */*

   {
     "lookup_table": {
        "items": {
            "car": "Машина",
            "plane": "Самолет"
        }
     }
   }

Same steps with curl:

.. sourcecode:: bash

   $ curl --user "user:password" -H 'Accept: */*' -X PUT -d '{"lookup_table":
   {"items":{"car":"Машина", "plane":"Самолет"}}}'
   http://<ngw url>/api/resource/

Change feature
----------------

To change feature in vector layer execute following request:

.. http:put:: /api/resource/(int:layer_id)/feature/(int:feature_id)

   Change feature request

   :param layer_id: layer resource identifier
   :param feature_id: feature identifier
   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :<json string geom: geometry in WKT format (geometry type and spatial reference must be corespondent to layer geometry type and spatial reference)
   :<jsonarr fields: attributes array in form of JSON field name - value object
   :<json int id: feature identifier
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   PUT /api/resource/3/feature/1 HTTP/1.1
   Host: ngw_url
   Accept: */*

   {
     "extensions": {
       "attachment": null,
       "description": null
     },
     "fields": {
       "Age": 1,
       "DateTr": {
         "day": 7,
         "month": 2,
         "year": 2015
       },
       "Davnost": 4,
       "Foto": 26,
       "Nomerp": 1,
       "Nomers": 1,
       "Samka": 0,
       "Sex": 3,
       "Sizeb": 0.0,
       "Sizef": 0.0,
       "Sizes": 9.19999980926514,
       "Snowdepth": 31,
       "Wher": "\u043b\u044b\u0436\u043d\u044f",
       "id01": 0
     },
     "geom": "MULTIPOINT (15112317.9207317382097244 6059092.3103669174015522)",
     "id": 1
   }

In request payload add only changed fields. Other fields will stay unchanged. Also geometry field may be skipped.

To change features in batch mode use patch request.

.. http:patch:: /api/resource/(int:layer_id)/feature

   Change features request

   :param layer_id: layer resource identifier
   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :<jsonarr string geom: geometry in WKT format (geometry type and spatial reference must be corespondent to layer geometry type and spatial reference)
   :<jsonarr jsonarr fields: attributes array in form of JSON field name - value object
   :<jsonarr int id: feature identifier
   :statuscode 200: no error

Request accepts array of JSON objects. If feature identifier is not present in PATCH
body a feature will be created, else - changed.

.. Метод принимает на вход список объектов, если у объекта передан id - то обновляется этот объект, а у которых не передан - те создаёт

**Example request**:

.. sourcecode:: http

   PATCH /api/resource/3/feature/ HTTP/1.1
   Host: ngw_url
   Accept: */*

   [
     {"geom": "POINT(30.20 10.15)", "fields": {"externalObjectId": "i1"}},
     {"id": 24, "geom": "POINT(30.20 10.15)", "fields": {"externalObjectId": "i2"}},
     {"geom": "POINT(30.20 10.15)", "fields": {"externalObjectId": "i3"}}
   ]

**Example response body**:

.. sourcecode:: json

   [
     {"id": 25},
     {"id": 24},
     {"id": 26}
   ]

Change attachment
------------------

Only following information can be changed:
* file name
* description

To change attachment execute following request:

.. http:put:: /api/resource/(int:layer_id)/feature/(int:feature_id)/attachment/(int:attachment_id)

   Change feature request

   :param layer_id: layer resource identifier
   :param feature_id: feature identifier
   :param attachment_id: attachment identifier
   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :<json name: new name
   :<json description: new description
   :>json id: attachment identifier
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   PUT /api/resource/3/feature/1/attachment/4 HTTP/1.1
   Host: ngw_url
   Accept: */*

   {"name": "49.qml", "description": "qqq"}
   
.. sourcecode:: bash

   curl --user "user:password" 'https://sandbox.nextgis.com/api/resource/9/feature/1/attachment/4' -X PUT -H 'content-type: application/json' -H 'accept: */*' --data-binary '{"name": "49.qml", "description": "qqq"}'

Delete feature
---------------

To delete feature from vector layer execute following request:

.. http:delete:: /api/resource/(int:layer_id)/feature/(int:feature_id)

   Delete feature request

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param layer_id: resource identifier
   :param feature_id: feature identifier
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   DELETE /api/resource/3/feature/1 HTTP/1.1
   Host: ngw_url
   Accept: */*
   
Delete features
---------------

To delete list of features execute following request:

.. http:delete:: /api/resource/(int:layer_id)/feature/

   Delete features request

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param layer_id: resource identifier
   :<jsonarr int id: feature identifier
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   DELETE /api/resource/3/feature/ HTTP/1.1
   Host: ngw_url
   Accept: */*
   
   [{"id": 25},{"id": 24},{"id": 26}]
   

Delete all features
---------------------

To delete all feature in vector layer execute following request:

.. http:delete:: /api/resource/(int:layer_id)/feature/

   Delete features request

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param layer_id: resource identifier
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   DELETE /api/resource/3/feature/ HTTP/1.1
   Host: ngw_url
   Accept: */*

Delete attachment
-----------------

To delete attachment from a feature execute following request:

.. http:delete:: /api/resource/(int:layer_id)/feature/(int:feature_id)/attachment/(int:attachment_id)

   Delete feature request

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param layer_id: resource identifier
   :param feature_id: feature identifier
   :param attachment_id: attachment identifier
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   DELETE /api/resource/3/feature/1/attachment/1 HTTP/1.1
   Host: ngw_url
   Accept: */*

.. sourcecode:: bash

   curl --user "user:password" -H 'Accept: */*' -X DELETE 'https://sandbox.nextgis.com/api/resource/9/feature/1/attachment/1'


Delete all attachments
----------------------

To delete all attachments of a feature execute following request:

.. http:put:: /api/resource/(int:layer_id)/feature/(int:feature_id)

   Change feature request

   :param layer_id: layer resource identifier
   :param feature_id: feature identifier
   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :<jsonarr extensions: empty attachment array
   :>json id: feature identifier
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   PUT /api/resource/3/feature/1 HTTP/1.1
   Host: ngw_url
   Accept: */*

   {
      "extensions":
      {
         "attachment":[]
      }
   }
   
.. sourcecode:: bash

   curl 'https://sandbox.nextgis.com/api/resource/9/feature/1' --user "user:password" -H 'Accept: */*' -X PUT -H 'content-type: application/json' --data-binary '{"extensions":{"attachment":[]}}'
