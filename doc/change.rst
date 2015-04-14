.. sectionauthor:: Дмитрий Барышников <dmitry.baryshnikov@nextgis.ru>

Change resource
===============

Для изменения ресурса необходимо выполнить следующий запрос.

.. http:put:: /resource/(int:parent_id)/child/(int:id)

   Запрос на изменение ресурса
    
   :param parent_id: идентификатор родительского ресурса
   :param id: идентификатор ресурса который необходимо изменить
   :<json string display_name: название ресурса
   :<json string keyname: уникальный ключ
   :<json int id: идентификатор
   :<json string description: описание
   :<jsonarray permissions: новые настройки доступа
   
**Example request**:

.. sourcecode:: http

   POST /resource/7/child/8 HTTP/1.1
   Host: Host: ngw_url
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
   Выполнятеся по аналогии с изменением ресурса. Обязательно необходимо передать настройки доступа.


