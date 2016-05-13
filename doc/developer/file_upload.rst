.. _ngw_file_upload:

Компонент file_upload
=====================

Загрузка файла
--------------

Для загрузки файла существует следующий запрос:

..  http:post:: /api/component/file_upload/upload

    Запрос на загрузку файла
    
    :form file: путь до файла
    :form name: имя файла

Далее следует multipart post запрос. В запросе вводятся следующие имена параметров формы:
`name` = "имя файла"

**Example request**:

.. sourcecode:: http

   POST /api/component/file_upload/upload HTTP/1.1
   Host: ngw_url
   Accept: */*
   
   file=\tmp\test.file&name=testfile
   

В результате выполнения запроса должен быть получен ответ содержащий информацию о загруженном файле:

**Example response body**:
    
.. sourcecode:: json 

    {
      "upload_meta": [
        {
          "id": "0eddf759-86d3-4fe0-b0f1-869fe783d2ed", 
          "mime_type": "application/octet-stream", 
          "name": "ngw1_1.zip", 
          "size": 2299
        }
      ]
    }

Загрузка нескольких файлов
--------------------------

Для загрузки файла существует следующий запрос:

..  http:post:: /api/component/file_upload/upload

    Запрос на загрузку файла

    :form name: должно быть "files[]"

В поле `name` записываются имена и пути до файлов (multipart post запрос). 

В результате должен быть получен ответ о загрузке следующего вида:
    
**Example response body**:
    
.. sourcecode:: json 

    {
      "upload_meta": [
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
    }

Изменение файла
---------------

..  http:put:: /api/component/file_upload/upload


