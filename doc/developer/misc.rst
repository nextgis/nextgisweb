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
GeoJSON, для растровых - TMS.

Для получения данных в формате GeoJSON необходимо выполнить следующий запрос:
    
.. http:get:: /resource/(int:id)/geojson/

    Запрос данных в GeoJson
    
    :param id: идентификатор ресурса  
    
      
**Example request**:

.. sourcecode:: http

   GET /resource/55/geojson/ HTTP/1.1
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

