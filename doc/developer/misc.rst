.. sectionauthor:: Дмитрий Барышников <dmitry.baryshnikov@nextgis.ru>

Miscellaneous
=============

Identification by polygon
-------------------------

Полигон - потому что в настройках задается допуск в пикселях.

.. http:put:: /feature_layer/identify

   Запрос на идентификацию
   
   :<json int srs: Spatial reference id
   :<json string geom: Polygon in WKT
   :<jsonarr int layers: layes id array


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


Get resource data
-----------------

У ресурсов можно получать их данные. Для векторных ресурсов это данные в формате 
GeoJSON и CSV, для растровых - TMS.

Для получения данных в формате GeoJSON необходимо выполнить следующий запрос:

.. deprecated:: 2.2        
.. http:get:: /resource/(int:id)/geojson/

.. versionadded:: 2.2
.. http:get:: /api/resource/(int:id)/geojson

    Запрос данных в GeoJson
    
    :param id: идентификатор ресурса  
    
      
**Example request**:

.. sourcecode:: http

   GET /api/resource/55/geojson HTTP/1.1
   Host: ngw_url
   Accept: */*

Для получения данных в формате CSV необходимо выполнить следующий запрос:

.. versionadded:: 2.2    
.. http:get:: /api/resource/(int:id)/csv

    Запрос данных в CSV
    
    :param id: идентификатор ресурса  
    
      
**Example request**:

.. sourcecode:: http

   GET /api/resource/55/csv HTTP/1.1
   Host: ngw_url
   Accept: */*
   
Для получения данных в формате TMS необходимо выполнить следующий запрос:

.. deprecated:: 2.2    
.. http:get:: /resource/(int:id)/tms?z=(int:z)&x=(int:x)&y=(int:y)

.. versionadded:: 2.2
.. http:get:: /api/component/render/tile?z=(int:z)&x=(int:x)&y=(int:y)&resource=(int:id1),(int:id2)...
    
    Запрос тайла
    
    :param id1, id2: идентификаторы ресурсов стилей
    :param z: уровень зума
    :param x: номер тайла по вертикали
    :param y: номер тайла по горизонтали
    
**Example request**:

.. sourcecode:: http

   GET /api/component/render/tile?z=7&x=84&y=42&resource=234 HTTP/1.1
   Host: ngw_url
   Accept: */*

Get user info
-------------

You can get user information by it id. The following request have to be executed:

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

To create new user the following request have to be executed:
    
.. versionadded:: 2.3
.. http:post:: /api/component/auth/user/

   request to create new user
   
   :<json string display_name: user full name
   :<json string keyname: user login
   :<json string description: user description
   :<json string password: user password

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
    
To create new group the following request have to be executed:
    
.. versionadded:: 2.3
.. http:post:: /api/component/auth/group/

   request to create new group
       
To self create user (anonymouse) the following request have to be executed:
    
.. versionadded:: 2.3
.. http:post:: /api/component/auth/register/

   request to create new user
   
   :<json string display_name: user full name
   :<json string keyname: user login
   :<json string description: user description
   :<json string password: user password        
    
Administrator can configure to anonymous user registration to the specific group 
(via setting checkbox in specific group in administrative interface).

The special section should be present in NGW config file for this purposes:
    
.. sourcecode:: config

   [auth]
   register = true
   
       

