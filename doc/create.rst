.. sectionauthor:: Дмитрий Барышников <dmitry.baryshnikov@nextgis.ru>

Create resource
===============

Group
-----

Для создания ресурса необходимо выполнить следующий запрос.

.. http:post:: /resource/(int:id)/child/

   Запрос на создание группы ресурсов
    
   :param id: идентификатор ресурса который необходимо изменить
   :<json string cls: тип (для группы должен быть "resource_group")
   :<json jsonobj parent:  идентификатор родительского ресурса (должен совпадать с идентификатором в адресе запроса: resource/0 - {"id":0})
   :<json string display_name: имя группы (**обязательно**)
   :<json string keyname: ключ (не обязательно)
   :<json int id: идентификатор
   :<json string description: описание, можно использовать html (не обязательно)
   
**Example request**:

.. sourcecode:: http

   POST /resource/0/child/ HTTP/1.1
   Host: Host: ngw_url
   Accept: */*
   
    {"resource":
      {"cls":"resource_group",
       "parent":{"id":0},
       "display_name":"test",
       "keyname":"test_key",
       "description":"qqq"
      }
    }   

PostGIS Connection
------------------

Для создания PostGIS подключения необходимо выполнить следующий запрос.

.. http:post:: /resource/(int:id)/child/

   Запрос на создание PostGIS подключения
    
   :param id: идентификатор ресурса который необходимо изменить
   :<json string cls: тип (для группы должен быть "postgis_connection")
   :<json jsonobj parent:  идентификатор родительского ресурса (должен совпадать с идентификатором в адресе запроса: resource/0 - {"id":0})
   :<json string display_name: имя подключения (**обязательно**)
   :<json string keyname: ключ (не обязательно)
   :<json int id: идентификатор
   :<json string description: описание, можно использовать html (не обязательно)
   :<json string database: имя БД 
   :<json string hostname: адрес БД
   :<json string password: пароль 
   :<json string username: логин
   
**Example request**:

.. sourcecode:: http

   POST /resource/0/child/ HTTP/1.1
   Host: Host: ngw_url
   Accept: */*
   
    {
      "postgis_connection": {
        "database": "postgis", 
        "hostname": "localhost", 
        "password": "secret", 
        "username": "user"
      }, 
      "resource": {
        "cls": "postgis_connection", 
        "description": "The localhost PostGIS Connection", 
        "display_name": "localhost", 
        "keyname": "localhost_key", 
        "parent": {
          "id": 0
        }
      }
    }      


PostGIS Layer
-------------

Для создания PostGIS слоя необходимо выполнить следующий запрос.

.. http:post:: /resource/(int:id)/child/

   Запрос на создание PostGIS слоя
    
   :param id: идентификатор ресурса который необходимо изменить
   :<json string cls: тип (для группы должен быть "postgis_layer")
   :<json jsonobj parent:  идентификатор родительского ресурса (должен совпадать с идентификатором в адресе запроса: resource/0 - {"id":0})
   :<json string display_name: имя слоя (**обязательно**)
   :<json string keyname: ключ (не обязательно)
   :<json int id: идентификатор
   :<json string description: описание, можно использовать html (не обязательно)
   :<json string column_geom: имя колонки с геометрией (обычно wkb_geometry)
   :<json string column_id: имя колонки уникального ключа (обычно ogc_fid)
   :<json jsonobj connection: идентификатор PostGIS подключения 
   :<json string fields: отметка необходимости чтения полей из базы данных ("update")
   :<json string geometry_type: тип геометрии (если равен null, то читается из базы данных)
   :<json string schema: схема базы данных, где размещается таблица
   :<json jsonobj srs: описание системы координат
   :<json string table: название таблицы
   
**Example request**:

.. sourcecode:: http

   POST /resource/0/child/ HTTP/1.1
   Host: Host: ngw_url
   Accept: */*
   
    {
      "postgis_layer": {
        "column_geom": "wkb_geometry", 
        "column_id": "ogc_fid", 
        "connection": {
          "id": 31
        }, 
        "fields": "update", 
        "geometry_type": null, 
        "schema": "thematic", 
        "srs": {
          "id": 3857
        }, 
        "table": "roads"
      }, 
      "resource": {
        "cls": "postgis_layer", 
        "description": null, 
        "display_name": "test", 
        "keyname": null, 
        "parent": {
          "id": 0
        }
      }
    }     


Vector layer
------------

Создание векторного слоя включает в себя 3 этапа:

1. Подготовка векторных данных для слоя
2. Загрузка векторных данных
3. Создание слоя

Подготовка векторных данных для слоя
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

При подготовке векторных данных необходимо преобразовать их к формату ESRI Shape, при этом поле с именем ID является запрещенным. Кроме того, файл должен иметь валидную систему координат и кодировку UTF-8 или CP1251. Также геометрии должны быть валидными и иметься у всех записей, атрибуты не должны содержать непечатных символов.

Загрузка векторных данных
^^^^^^^^^^^^^^^^^^^^^^^^^

Подготовленный шейп-файл необходимо заархивировать в zip и загрузить (подробнее по загрузке файлов см. :ref:`file_upload`).

Создание слоя
^^^^^^^^^^^^^

Для создания векторного слоя необходимо выполнить следующий запрос.

.. http:post:: /resource/(int:id)/child/

   Запрос на создание векторного слоя
    
   :param id: идентификатор ресурса который необходимо изменить
   :<json string cls: тип (для векторного слоя должен быть "vector_layer")
   :<json jsonobj parent:  идентификатор родительского ресурса (должен совпадать с идентификатором в адресе запроса: resource/0 - {"id":0})
   :<json string display_name: имя слоя (**обязательно**)
   :<json string keyname: ключ (не обязательно)
   :<json int id: идентификатор
   :<json string description: описание, можно использовать html (не обязательно)
   :<json jsonobj source: информация полученная в результате загрузки файла
   :<json jsonobj srs: система координат в которую необходимо перепроецировать входной файл. Должна соответсвоваться СК веб карты
   
**Example request**:

.. sourcecode:: http

   POST /resource/0/child/ HTTP/1.1
   Host: Host: ngw_url
   Accept: */*
   
    {
      "resource": {
        "cls": "vector_layer", 
        "description": null, 
        "display_name": "ggg www", 
        "keyname": null, 
        "parent": {
          "id": 0
        }
      }, 
      "vector_layer": {
        "source": {
          "encoding": "utf-8", 
          "id": "2f906bf9-0947-45aa-b271-c711fef1d2fd", 
          "mime_type": "application/zip", 
          "name": "ngw1_1.zip", 
          "size": 2299
        }, 
        "srs": {
          "id": 3857
        }
      }
    }

Raster layer
------------

Создание растрового слоя включает в себя 3 этапа:

1. Подготовка растра для слоя
2. Загрузка растра
3. Создание слоя

Подготовка растра для слоя
^^^^^^^^^^^^^^^^^^^^^^^^^^

В качестве растра должен выступать файл в формате GeoTIFF с 3-мя (RGB) или 4-мя (RGBA) каналами. Растр должен содержать географическую привязку, из которой возможно перепроецировать в СК веб-карты. Для каналов должны быть корректно заданы значения color interpretation. Рекомендуется использовать сжатие без искажения (LZW, DEFLATE) для снижения трафика при загрузки на сервер. Значение пиксела должно быть 1 байт (яркость от от 0 до 255).

Загрузка растра
^^^^^^^^^^^^^^^

Подготовленный растр необходимо загрузить (подробнее по загрузке файлов см. :ref:`file_upload`).

Создание слоя
^^^^^^^^^^^^^

.. todo:
   Написать про загрузку слоя

File bucket
-----------

Создание набора файлов включает в себя 2 этапа:

1. Загрузка файлов
2. Вызов POST запроса создание набора файлов

Загрузка файлов
^^^^^^^^^^^^^^^

Файлы необходимо загрузить (подробнее по загрузке файлов см. :ref:`file_upload`).

Создание набора файлов
^^^^^^^^^^^^^^^^^^^^^^

Для создания набора файлов необходимо выполнить следующий запрос.


.. http:post:: /resource/(int:id)/child/

   Запрос на создание набора файлов
    
   :param id: идентификатор ресурса который необходимо изменить
   :<json string cls: тип (для набора файлов должен быть "file_bucket")
   :<json jsonobj parent:  идентификатор родительского ресурса (должен совпадать с идентификатором в адресе запроса: resource/0 - {"id":0})
   :<json string display_name: имя слоя (**обязательно**)
   :<json string keyname: ключ (не обязательно)
   :<json int id: идентификатор
   :<json string description: описание, можно использовать html (не обязательно)
   :<json jsonobj files: перечень файлов входящих в набор (то что приходи в ответе при загрузке, files == upload_meta)
   
**Example request**:

.. sourcecode:: http

   POST /resource/0/child/ HTTP/1.1
   Host: Host: ngw_url
   Accept: */*

    {
      "file_bucket": {
        "files": [
          {
            "id": "b5c02d94-e1d7-40cf-b9c7-79bc9cca429d", 
            "mime_type": "application/octet-stream", 
            "name": "grunt_area_2_multipolygon.cpg", 
            "size": 5
          }, 
          {
            "id": "d8457f14-39cb-4f9d-bb00-452a381fa62e", 
            "mime_type": "application/x-dbf", 
            "name": "grunt_area_2_multipolygon.dbf", 
            "size": 36607
          }, 
          {
            "id": "1b0754f8-079d-4675-9367-36531da247e1", 
            "mime_type": "application/octet-stream", 
            "name": "grunt_area_2_multipolygon.prj", 
            "size": 138
          }, 
          {
            "id": "a34b5ab3-f3a5-4a60-835d-318e601d34df", 
            "mime_type": "application/x-esri-shape", 
            "name": "grunt_area_2_multipolygon.shp", 
            "size": 65132
          }, 
          {
            "id": "fb439bfa-1a63-4384-957d-ae57bb5eb67b", 
            "mime_type": "application/x-esri-shape", 
            "name": "grunt_area_2_multipolygon.shx", 
            "size": 1324
          }
        ]
      }, 
      "resource": {
        "cls": "file_bucket", 
        "description": null, 
        "display_name": "grunt_area", 
        "keyname": null, 
        "parent": {
          "id": 0
        }
      }
    }

Vector (mapserver) style
------------------------

.. todo:
   Написать 
    
Raster style
------------

.. todo:
   Написать 
    
