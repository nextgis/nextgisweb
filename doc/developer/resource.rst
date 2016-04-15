.. format instructions http://pythonhosted.org/sphinxcontrib-httpdomain/#

Resources
=========

..  automodule:: nextgisweb.resource.scope
    :members:

Resources (cls) can be:
   
* resource_group
* postgis_layer
* wmsserver_service
* baselayers
* postgis_connection
* webmap
* wfsserver_service
* vector_layer
* raster_layer
* vector_style
* raster_style
* file_bucket   
* lookup_table
 

HTTP API
--------

Schema query
^^^^^^^^^^^^

При запросе схемы получается состав поддерживаемых типов ресурсов и их 
характеристики и другие метаданные.  

.. http:get:: /resource/schema

   Проверка состава ресурсов.
 
.. note::    
   Для запросов REST API в заголовке HTTP запроса должны быть обязательно прописано: `Accept: */*`
    
**Пример запроса**:

.. sourcecode:: http

   GET /resource/schema HTTP/1.1
   Host: ngw_url
   Accept: */*
   
**Пример тела ответа в формате JSON**:
    

.. sourcecode:: json

    {
      "resources": {
        "mapserver_style": {
          "identity": "mapserver_style", 
          "label": "\u0421\u0442\u0438\u043b\u044c MapServer", 
          "scopes": [
            "resource", 
            "data", 
            "metadata"
          ]
        }, 
        "postgis_connection": {
          "identity": "postgis_connection", 
          "label": "\u0421\u043e\u0435\u0434\u0438\u043d\u0435\u043d\u0438\u0435 
                   PostGIS", 
          "scopes": [
            "connection", 
            "resource", 
            "metadata"
          ]
        }, 
        "postgis_layer": {
          "identity": "postgis_layer", 
          "label": "\u0421\u043b\u043e\u0439 PostGIS", 
          "scopes": [
            "resource", 
            "datastruct", 
            "data", 
            "metadata"
          ]
        }, 
        "raster_layer": {
          "identity": "raster_layer", 
          "label": "\u0420\u0430\u0441\u0442\u0440\u043e\u0432\u044b\u0439 
                    \u0441\u043b\u043e\u0439", 
          "scopes": [
            "resource", 
            "datastruct", 
            "data", 
            "metadata"
          ]
        }, 
        "raster_style": {
          "identity": "raster_style", 
          "label": "\u0420\u0430\u0441\u0442\u0440\u043e\u0432\u044b\u0439 
                    \u0441\u0442\u0438\u043b\u044c", 
          "scopes": [
            "resource", 
            "data", 
            "metadata"
          ]
        }, 
        "resource": {
          "identity": "resource", 
          "label": "\u0420\u0435\u0441\u0443\u0440\u0441", 
          "scopes": [
            "resource", 
            "metadata"
          ]
        }, 
        "resource_group": {
          "identity": "resource_group", 
          "label": "\u0413\u0440\u0443\u043f\u043f\u0430 \u0440\u0435\u0441
                    \u0443\u0440\u0441\u043e\u0432", 
          "scopes": [
            "resource", 
            "metadata"
          ]
        }, 
        "vector_layer": {
          "identity": "vector_layer", 
          "label": "\u0412\u0435\u043a\u0442\u043e\u0440\u043d\u044b\u0439 
                    \u0441\u043b\u043e\u0439", 
          "scopes": [
            "resource", 
            "datastruct", 
            "data", 
            "metadata"
          ]
        }, 
        "webmap": {
          "identity": "webmap", 
          "label": "\u0412\u0435\u0431-\u043a\u0430\u0440\u0442\u0430", 
          "scopes": [
            "resource", 
            "webmap", 
            "metadata"
          ]
        }, 
        "wfsserver_service": {
          "identity": "wfsserver_service", 
          "label": "\u0421\u0435\u0440\u0432\u0438\u0441 WFS", 
          "scopes": [
            "resource", 
            "metadata"
          ]
        }, 
        "wmsclient_connection": {
          "identity": "wmsclient_connection", 
          "label": "\u0421\u043e\u0435\u0434\u0438\u043d\u0435\u043d\u0438\u0435 
                    WMS", 
          "scopes": [
            "connection", 
            "resource", 
            "metadata"
          ]
        }, 
        "wmsclient_layer": {
          "identity": "wmsclient_layer", 
          "label": "C\u043b\u043e\u0439 WMS", 
          "scopes": [
            "resource", 
            "datastruct", 
            "data", 
            "metadata"
          ]
        }, 
        "wmsserver_service": {
          "identity": "wmsserver_service", 
          "label": "\u0421\u0435\u0440\u0432\u0438\u0441 WMS", 
          "scopes": [
            "resource", 
            "metadata"
          ]
        }
      }, 
      "scopes": {
        "connection": {
          "identity": "connection", 
          "label": "\u0421\u043e\u0435\u0434\u0438\u043d\u0435\u043d\u0438\u0435", 
          "permissions": {
            "connect": {
              "label": "\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432
                        \u0430\u043d\u0438\u0435 \u0441\u043e\u0435\u0434\u0438
                        \u043d\u0435\u043d\u0438\u044f"
            }, 
            "read": {
              "label": "\u0427\u0442\u0435\u043d\u0438\u0435 \u043f\u0430\u0440
                        \u0430\u043c\u0435\u0442\u0440\u043e\u0432 \u0441\u043e
                        \u0435\u0434\u0438\u043d\u0435\u043d\u0438\u044f"
            }, 
            "write": {
              "label": "\u0417\u0430\u043f\u0438\u0441\u044c \u043f\u0430\u0440
                        \u0430\u043c\u0435\u0442\u0440\u043e\u0432 \u0441\u043e
                        \u0435\u0434\u0438\u043d\u0435\u043d\u0438\u044f"
            }
          }
        }, 
        "data": {
          "identity": "data", 
          "label": "\u0414\u0430\u043d\u043d\u044b\u0435", 
          "permissions": {
            "read": {
              "label": "\u0427\u0442\u0435\u043d\u0438\u0435"
            }, 
            "write": {
              "label": "\u0417\u0430\u043f\u0438\u0441\u044c"
            }
          }
        }, 
        "datastruct": {
          "identity": "datastruct", 
          "label": "\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430 
                    \u0434\u0430\u043d\u043d\u044b\u0445", 
          "permissions": {
            "read": {
              "label": "\u0427\u0442\u0435\u043d\u0438\u0435"
            }, 
            "write": {
              "label": "\u0417\u0430\u043f\u0438\u0441\u044c"
            }
          }
        }, 
        "metadata": {
          "identity": "metadata", 
          "label": "\u041c\u0435\u0442\u0430\u0434\u0430\u043d\u043d\u044b\u0435", 
          "permissions": {
            "read": {
              "label": "\u0427\u0442\u0435\u043d\u0438\u0435"
            }, 
            "write": {
              "label": "\u0417\u0430\u043f\u0438\u0441\u044c"
            }
          }
        }, 
        "resource": {
          "identity": "resource", 
          "label": "\u0420\u0435\u0441\u0443\u0440\u0441", 
          "permissions": {
            "change_permissions": {
              "label": "\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438
                        \u0435 \u043f\u0440\u0430\u0432\u0430\u043c\u0438 \u0434
                        \u043e\u0441\u0442\u0443\u043f\u0430"
            }, 
            "create": {
              "label": "\u0421\u043e\u0437\u0434\u0430\u043d\u0438\u0435"
            }, 
            "delete": {
              "label": "\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u0435"
            }, 
            "manage_children": {
              "label": "\u0423\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438
                        \u0435 \u0434\u043e\u0447\u0435\u0440\u043d\u0438\u043c
                        \u0438 \u0440\u0435\u0441\u0443\u0440\u0441\u0430\u043c
                        \u0438"
            }, 
            "read": {
              "label": "\u0427\u0442\u0435\u043d\u0438\u0435"
            }, 
            "update": {
              "label": "\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435"
            }
          }
        }, 
        "webmap": {
          "identity": "webmap", 
          "label": "\u0412\u0435\u0431-\u043a\u0430\u0440\u0442\u0430", 
          "permissions": {
            "display": {
              "label": "\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440"
            }
          }
        }
      }
    }
   
   
Basic queries 
^^^^^^^^^^^^^^^    

..  http:get:: /api/resource/(int:id)

    Получить JSON представление ресурса. Для вызова этого метода необходимо как 
    минимум право чтения ресурса.

..  http:put:: /api/resource/(int:id)

    Изменить ресурс в соответствии с переданным JSON. Так же необходимо право 
    чтения ресурса.

..  http:delete:: /api/resource/(int:id)

    Удалить ресурс.

..  http:get:: /api/resource/

    Выбрать ресурсы и получить JSON.

    :param integer parent: Идентификатор ресурса-родителя.

..  http:post:: /api/resource/

    Создать ресурс в соответствии с JSON.

    :param integer parent: Идентификатор ресурса-родителя, так же может быть передан в JSON.
    :param string cls: Идентификатор класса создаваемого ресурса.
    
 
Get feature
^^^^^^^^^^^

Get single feature

.. http:get:: /api/resource/(int:id)/feature/(int:feature_id)

Get all vector layer features

.. http:get:: /api/resource/(int:id)/feature/

**Query example**:

.. sourcecode:: http

   GET api/resource/1878/feature/8 HTTP/1.1
   Host: ngw_url
   Accept: */*
   
**Query result in JSON**:

.. sourcecode:: json

  {
    "id": 8,
    "geom": "MULTIPOLYGON (((4071007.5456240694038570 7385427.4912760490551591, 
                             4071010.5846461649052799 7385440.8649944914504886, 
                             4071018.6441773008555174 7385439.0351102603599429, 
                             4071019.4902054299600422 7385442.7727465946227312, 
                             4071057.3388322992250323 7385434.1683989763259888,
                             4071056.4928041673265398 7385430.4307667789980769, 
                             4071065.5208148718811572 7385428.1726148622110486, 
                             4071062.6153761623427272 7385414.7794514624401927, 
                             4071058.2961799190379679 7385415.5581231201067567, 
                             4071055.1347063803113997 7385401.6588457319885492, 
                             4071007.8795825401321054 7385412.3850365970283747, 
                             4071011.1301116724498570 7385426.6931363716721535, 
                             4071007.5456240694038570 7385427.4912760490551591)))",
    "fields": {
        "OSM_ID": 128383475,
        "BUILDING": "apartments",
        "A_STRT": "проспект Ленина",
        "A_SBRB": "",
        "A_HSNMBR": "209",
        "B_LEVELS": "14",
        "NAME": ""
    }
  }

**Пример тела ответа с фотографиями и описанием**:

.. sourcecode:: json

   {
        "id": 1,
        "geom": "MULTIPOINT (14690369.3387846201658249 5325725.3689366327598691)",
        "fields": {
            "name_official": "Краевое государственное автономное учреждение...",
            "name_short": "МФЦ Приморского края",
            "square": "702",
            "windows": "16",
            "start_date": "2013/12/30",
            "addr": "690080, Приморский край. г. Владивосток, ул. Борисенко д. 102",
            "phone_consult": "(423) 201-01-56",
            "opening_hours": "пн: 09:00-18:00 (по предварительной записи)вт: 09:00-20:00ср: 11:00-20:00чт: 09:00-20:00пт: 09:00-20:00 сб: 09:00-13:00 вс: выходной",
            "director": "Александров Сергей Валерьевич",
            "desc": "Центр создан в целях ...",
            "services_info": "Ознакомиться с перечнем можно ...",
            "issue_info": "ответственность должностных лиц ...",
            "website": "http://mfc-25.ru"
          },
        "extensions": {
            "description": " Описание объекта в ...",
            "attachment": [
                {
                    "id": 1,
                    "name": "fyADeqvXtXo.jpg",
                    "size": 107458, 
                    "mime_type": "image/jpeg",
                    "description": null, 
                    "is_image": true
                },
                {
                    "id": 2, 
                    "name": "0_12cb49_b02b5fb0_orig.jpg",
                    "size": 65121, 
                    "mime_type": "image/jpeg",
                    "description": "Текст подписи к фото",
                    "is_image": true
                }
            ]
        }
    }


URL к фотографиям составляется из корня URL, который нужно посмотреть в веб-интерфейсе админки, и этого имени файла. Пример:

.. http:get:: /api/resource/(int:id)/feature/(int:feature_id)/attachment/(int:attachment_id)/download

Получение превью фотографий

.. http:get:: /api/resource/(int:id)/feature/(int:feature_id)/attachment/(int:attachment_id)/image?size=200x150

Запрос количества обектов векторного слоя

.. http:get:: /api/resource/(int:id)/feature_count
    
Запросы к корню
^^^^^^^^^^^^^^^

.. deprecated:: 2.2
.. http:get:: /resource/-/child/   

   Корневой ресурс (список)

.. deprecated:: 2.2
.. http:get:: /resource/-/child/(int:id)
    
   Корневой ресурс (объект `id`)
    
.. http:get:: /resource/(int:id)/child/
    
   Список дочерних ресурсов ресурса `id` (список)
    
.. http:get:: /resource/(int:parent_id)/child/(int:id)
   
   Ресурс `id` (объект)

.. deprecated:: 2.2
.. http:get:: /resource/store/             

    Плоский список всех ресурсов (список)
    
.. deprecated:: 2.2
.. http:get:: /resource/store/(int:id)           

   Ресурс `id` (объект)

.. deprecated:: 2.2
.. http:get:: /resource/store/?id=(int:id)        

   Ресурс `id` (объект), то же самое, что и предыдущий запрос

.. deprecated:: 2.2
.. http:get:: /resource/store/?parent_id=(int:id)

   Cписок дочерних объектов объекта `id` (список)

Get version
^^^^^^^^^^^^
.. versionadded:: 3.0

To get version execute query:

.. http:get:: /api/component/pyramid/pkg_version

**Query example**:

.. sourcecode:: http

   GET /api/component/pyramid/pkg_version HTTP/1.1
   Host: ngw_url
   Accept: */*
   
**Query result in JSON**:

.. sourcecode:: json

   {
      "nextgisweb": "2.0",
      "nextgisweb_mapserver": "0.0dev"
   }
