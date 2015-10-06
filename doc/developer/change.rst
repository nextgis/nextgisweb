.. sectionauthor:: Дмитрий Барышников <dmitry.baryshnikov@nextgis.ru>

Редактирование
==============

Изменение ресурса
-----------------

Для изменения ресурса необходимо выполнить следующий запрос.

.. http:put:: /resource/(int:parent_id)/child/(int:id)

   Запрос на изменение ресурса
    
   :param parent_id: идентификатор родительского ресурса
   :param id: идентификатор ресурса который необходимо изменить
   :<json string display_name: название ресурса
   :<json string keyname: уникальный ключ
   :<json int id: идентификатор
   :<json string description: описание
   :jsonarray permissions: новые настройки доступа
   
**Example request**:

.. sourcecode:: http

   POST /resource/7/child/8 HTTP/1.1
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
   Выполняется по аналогии с изменением ресурса. Обязательно необходимо передать 
   настройки доступа.
   
Создание записи
---------------   

Для создания записи в векторном слое необходимо выполнить следующий запрос.

.. http:post:: /api/resource/(int:layer_id)/feature/

   Запрос на создание записи
   
   :param layer_id: идентификатор слоя
   :<json string geom: WKT представление геометрии (должно быть типа MULTI и в СК слоя)
   :<json array fields: массив атрибутов в виде название поля - значение 
   
**Example request**:

.. sourcecode:: http   

   POST /api/resource/3/feature/ HTTP/1.1
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
     "geom": "MULTIPOINT (15112317.9207317382097244 6059092.3103669174015522)"
   }

При задании даты необходимо разделить ее на составляющие части: *day*, *month*,
*day*. Поля которые имеются в слое, но отсутствуют в запросе не будут изменены.
При формировании запроса не обязательно указывать все поля - достаточно только
те, что необходимо изменить.

Изменение записи
----------------

Для изменения записи в векторном слое необходимо выполнить следующий запрос.

.. http:put:: /api/resource/(int:layer_id)/feature/(int:feature_id)

   Запрос на изменение записи
   
   :param layer_id: идентификатор слоя
   :param feature_id: идентификатор записи
   :<json string geom: WKT представление геометрии (должно быть типа MULTI и в СК слоя)
   :<json array fields: массив атрибутов в виде название поля - значение 
   :<json int id: идентификатор записи
   
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

Удаление записи
---------------

Для удаления записи в векторном слое необходимо выполнить следующий запрос.

.. http:delete:: /api/resource/(int:layer_id)/feature/(int:feature_id)

   Запрос на удаление записи
   
   :param layer_id: идентификатор слоя
   :param feature_id: идентификатор записи
   
**Example request**:

.. sourcecode:: http

   DELETE /api/resource/3/feature/1 HTTP/1.1
   Host: ngw_url
   Accept: */*
   
   
Удаление всех записей
---------------------

Для удаления всех записей в векторном слое необходимо выполнить следующий запрос.

.. http:delete:: /api/resource/(int:layer_id)/feature/

   Запрос на удаление записей
   
   :param layer_id: идентификатор слоя
   
**Example request**:

.. sourcecode:: http

   DELETE /api/resource/3/feature/ HTTP/1.1
   Host: ngw_url
   Accept: */*
   
   
