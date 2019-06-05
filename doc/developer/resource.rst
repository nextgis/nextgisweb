.. sectionauthor:: Dmitry Baryshnikov <dmitry.baryshnikov@nextgis.ru>

.. format instructions http://pythonhosted.org/sphinxcontrib-httpdomain/#

Resources
=========

.. _ngwdev_resource_classes:

Resource classes
--------------------

There are following resource classes now:

* resource_group
* postgis_layer
* wmsserver_service
* baselayers
* postgis_connection
* webmap
* wfsserver_service
* vector_layer
* raster_layer
* mapserver_style
* qgis_vector_style
* raster_style
* file_bucket
* lookup_table
* wmsclient_layer
* wmsclient_connection
* formbuilder_form
* trackers_group
* tracker

HTTP API
---------

Version
^^^^^^^

.. versionadded:: 3.0

To get NextGIS Web API version execute the following request:

.. http:get:: /api/component/pyramid/pkg_version

**Example request**:

.. sourcecode:: http

   GET /api/component/pyramid/pkg_version HTTP/1.1
   Host: ngw_url
   Accept: */*

**Example JSON response**:

.. sourcecode:: json

   {
      "nextgisweb": "2.0",
      "nextgisweb_mapserver": "0.0dev"
   }


Routes
^^^^^^^

.. versionadded:: 3.0

Routes are the REST API URLs which are supported by current instance of NextGIS
Web. To get possible routes execute the following request:

.. http:get:: /api/component/pyramid/route

**Example request**:

.. sourcecode:: http

   GET /api/component/pyramid/route HTTP/1.1
   Host: ngw_url
   Accept: */*

**Example JSON response**:

.. sourcecode:: json

    {
        "pyramid.settings": [
            "/api/component/pyramid/settings"
        ],
        "feature_layer.store.item": [
            "/resource/{0}/store/{1}",
            "id",
            "feature_id"
        ],
        "feature_layer.feature.update": [
            "/resource/{0}/feature/{1}/update",
            "id",
            "feature_id"
        ],
	...
        "pyramid.statistics": [
            "/api/component/pyramid/statistics"
        ],
        "feature_layer.feature.item": [
            "/api/resource/{0}/feature/{1}",
            "id",
            "fid"
        ],
        "pyramid.pkg_version": [
            "/api/component/pyramid/pkg_version"
        ]
    }


Schema
^^^^^^^

Schema request returns list of supported NextGIS Web resources, each resource type
properties and metadata.

.. http:get:: /resource/schema

   Schema request.

.. note::
   REST API requests require accept field in header with following text: `Accept: */*`

**Example request**:

.. sourcecode:: http

   GET /resource/schema HTTP/1.1
   Host: ngw_url
   Accept: */*

**Example JSON response**:

.. sourcecode:: json

    {
        "scopes": {
            "resource": {
                "label": "Ресурс",
                "identity": "resource",
                "permissions": {
                    "manage_children": {
                        "label": "Manage child resources"
                    },
                    "change_permissions": {
                        "label": "Change permissions"
                    },
                    "read": {
                        "label": "Read"
                    },
                    "create": {
                        "label": "Create"
                    },
                    "update": {
                        "label": "Modify"
                    },
                    "delete": {
                        "label": "Delete"
                    }
                }
            },
            "service": {
                "label": "Сервис",
                "identity": "service",
                "permissions": {
                    "connect": {
                        "label": "Connection"
                    },
                    "configure": {
                        "label": "Configure"
                    }
                }
            },
            "datastruct": {
                "label": "Data structure",
                "identity": "datastruct",
                "permissions": {
                    "write": {
                        "label": "White"
                    },
                    "read": {
                        "label": "Read"
                    }
                }
            },
            "connection": {
                "label": "Connection",
                "identity": "connection",
                "permissions": {
                    "write": {
                        "label": "Write"
                    },
                    "read": {
                        "label": "Read"
                    },
                    "connect": {
                        "label": "Connect"
                    }
                }
            },
            "webmap": {
                "label": "Web-map",
                "identity": "webmap",
                "permissions": {
                    "display": {
                        "label": "Open"
                    }
                }
            },
            "data": {
                "label": "Data",
                "identity": "data",
                "permissions": {
                    "write": {
                        "label": "Write"
                    },
                    "read": {
                        "label": "Read"
                    }
                }
            },
            "metadata": {
                "label": "Metadata",
                "identity": "metadata",
                "permissions": {
                    "write": {
                        "label": "Write"
                    },
                    "read": {
                        "label": "Read"
                    }
                }
            }
        },
        "resources": {
            "raster_style": {
                "scopes": [
                    "resource",
                    "data",
                    "metadata"
                ],
                "identity": "raster_style",
                "label": "Raster style"
            },
            "resource": {
                "scopes": [
                    "resource",
                    "metadata"
                ],
                "identity": "resource",
                "label": "Resource"
            },
            "postgis_connection": {
                "scopes": [
                    "connection",
                    "resource",
                    "metadata"
                ],
                "identity": "postgis_connection",
                "label": "PostGIS connection"
            },
            "resource_group": {
                "scopes": [
                    "resource",
                    "metadata"
                ],
                "identity": "resource_group",
                "label": "Resource group"
            },
            "wmsclient_connection": {
                "scopes": [
                    "connection",
                    "resource",
                    "metadata"
                ],
                "identity": "wmsclient_connection",
                "label": "WMS connection"
            },
            "mapserver_style": {
                "scopes": [
                    "resource",
                    "data",
                    "metadata"
                ],
                "identity": "mapserver_style",
                "label": "MapServer style"
            },
            "vector_layer": {
                "scopes": [
                    "resource",
                    "datastruct",
                    "data",
                    "metadata"
                ],
                "identity": "vector_layer",
                "label": "Vector layer"
            },
            "qgis_vector_style": {
                "scopes": [
                    "resource",
                    "data",
                    "metadata"
                ],
                "identity": "qgis_vector_style",
                "label": "QGIS style"
            },
            "wmsclient_layer": {
                "scopes": [
                    "resource",
                    "datastruct",
                    "data",
                    "metadata"
                ],
                "identity": "wmsclient_layer",
                "label": "WMS layer"
            },
            "basemap_layer": {
                "scopes": [
                    "resource",
                    "data",
                    "metadata"
                ],
                "identity": "basemap_layer",
                "label": "Basemap"
            },
            "wfsserver_service": {
                "scopes": [
                    "resource",
                    "service",
                    "metadata"
                ],
                "identity": "wfsserver_service",
                "label": "WFS service"
            },
            "lookup_table": {
                "scopes": [
                    "resource",
                    "data",
                    "metadata"
                ],
                "identity": "lookup_table",
                "label": "Reference"
            },
            "postgis_layer": {
                "scopes": [
                    "resource",
                    "datastruct",
                    "data",
                    "metadata"
                ],
                "identity": "postgis_layer",
                "label": "PostGIS layer"
            },
            "webmap": {
                "scopes": [
                    "resource",
                    "webmap",
                    "metadata"
                ],
                "identity": "webmap",
                "label": "Web map"
            },
            "wmsserver_service": {
                "scopes": [
                    "resource",
                    "service",
                    "metadata"
                ],
                "identity": "wmsserver_service",
                "label": "WMS service"
            },
            "raster_layer": {
                "scopes": [
                    "resource",
                    "datastruct",
                    "data",
                    "metadata"
                ],
                "identity": "raster_layer",
                "label": "Raster layer"
            }
        }
    }

Basic requests
^^^^^^^^^^^^^^^

..  http:get:: /api/resource/(int:id)

    Get JSON resource representation. Need resource read permission.

..  http:put:: /api/resource/(int:id)

    Change resource by JSON payload data. Need read and write permissions.

..  http:delete:: /api/resource/(int:id)

    Delete resource.

..  http:get:: /api/resource/

    Get resource description in JSON.

    :param integer parent: Parent resource identifier.

..  http:post:: /api/resource/

    Create resource by JSON data payload.

    :param integer parent: Parent resource identifier, may be in JSON payload.
    :param string cls: Resource class (type). For a list of supported resource classes see :ref:`ngwdev_resource_classes`.

Search resources
^^^^^^^^^^^^^^^^^

To search resources execute the following request:

.. http:get:: /api/resource/search/?(string:key1)=(string:value1)&(string:key2)=(string:value2)...

   Search resources.

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param key1, key2...: resource properties (for example, cls, creation_date, keyname). If resource property has children they divided by double underscore (``__``). The ``serialization=full`` parameter make return list of resources with full description, otherwise only ``resource`` key will returned.
   :param value1,value2...: key value to search. All ``key=value`` pairs form following search string ``key1=value1 AND key2=value2 AND ...``.
   :statuscode 200: no error
   :>jsonarr resource: Array of resource json representation.

.. warning::
   Now supported only ``owner_user__id`` key with child.

.. note::
   Without any parameters request returns all resources available by current user.


**Example request**:

Search by keyname
.. sourcecode:: http

   GET /api/resource/search/?keyname=satellite HTTP/1.1
   Host: ngw_url
   Accept: */*

**Example response**:

.. sourcecode:: json

    [
        {
            "resource": {
                "id": 856,
                "cls": "resource_group",
                "creation_date": "1970-01-01T00:00:00",
                "parent": {
                    "id": 0,
                    "parent": {
                        "id": null
                    }
                },
                "owner_user": {
                    "id": 4
                },
                "permissions": [],
                "keyname": "satellite",
                "display_name": "111222",
                "children": false,
                "interfaces": [],
                "scopes": [
                    "resource",
                    "metadata"
                ]
            },
            "resmeta": {}
        }
    ]

Found only one resource because keyname is unique in whole NextGIS Web instance.


**Example request**:

Search by name

.. sourcecode:: http

   GET /api/resource/search/?display_name=photos HTTP/1.1
   Host: ngw_url
   Accept: */*
   


Child resource
^^^^^^^^^^^^^^^

To get child resources of parent resource with identifier ``id`` execute the
following request:

.. http:get:: /api/resource/?parent=(int:id)

**Example JSON response**:

.. sourcecode:: json
   
   {
      "resource": {
         "id": 730,
         "cls": "webmap",
         "parent": {
            "id": 640,
            "parent": {
               "id": 639
            }
         },
         "owner_user": {
            "id": 4
         },
         "permissions": [],
         "keyname": null,
         "display_name": "OpenDroneMap sample",
         "description": null,
         "children": false,
         "interfaces": [],
         "scopes": [
            "resource",
            "webmap",
            "metadata"
         ]
      },
      "webmap": {
         "extent_left": -83.31,
         "extent_right": -83.3,
         "extent_bottom": 41.042,
         "extent_top": 41.034,
         "bookmark_resource": null,
         "root_item": {
            "item_type": "root",
            "children": [
               {
                  "layer_adapter": "image",
                  "layer_enabled": true,
                  "layer_max_scale_denom": null,
                  "item_type": "layer",
                  "layer_min_scale_denom": null,
                  "display_name": "Seneca country",
                  "layer_style_id": 642,
                  "layer_transparency": null
               }
            ]
         }
      },
      "basemap_webmap": {
         "basemaps": [
            {
               "opacity": null,
               "enabled": true,
               "position": 0,
               "display_name": "HikeBikeMap",
               "resource_id": 1039
            },
            {
               "opacity": null,
               "enabled": true,
               "position": 1,
               "display_name": "Спутник",
               "resource_id": 1038
            }
         ]
      },
      "resmeta": {
         "items": {}
      }
   },
   {
      "resource": {
         "id": 641,
         "cls": "raster_layer",
         "parent": {
            "id": 640,
            "parent": {
               "id": 639
            }
         },
         "owner_user": {
            "id": 4
         },
         "permissions": [],
         "keyname": null,
         "display_name": "odm_orthophoto_low",
         "description": null,
         "children": true,
         "interfaces": [
            "IBboxLayer"
         ],
         "scopes": [
            "resource",
            "datastruct",
            "data",
            "metadata"
         ]
      },
      "resmeta": {
         "items": {}
      },
      "raster_layer": {
         "srs": {
            "id": 3857
         },
         "xsize": 16996,
         "ysize": 17054,
         "band_count": 4
      }
   },
   {
      "resource": {
         "id": 1041,
         "cls": "wfsserver_service",
         "parent": {
            "id": 640,
            "parent": {
               "id": 639
            }
         },
         "owner_user": {
            "id": 4
         },
         "permissions": [],
         "keyname": null,
         "display_name": "WFS service for demo",
         "description": null,
         "children": false,
         "interfaces": [],
         "scopes": [
            "resource",
            "service",
            "metadata"
         ]
      },
      "resmeta": {
         "items": {}
      },
      "wfsserver_service": {
         "layers": [
            {
               "maxfeatures": 2222,
               "keyname": "lines",
               "display_name": "Просеки",
               "resource_id": 534
            }
         ]
      }
   },
   {
      "resource": {
         "id": 1036,
         "cls": "resource_group",
         "parent": {
            "id": 640,
            "parent": {
               "id": 639
            }
         },
         "owner_user": {
            "id": 4
         },
         "permissions": [],
         "keyname": null,
         "display_name": "Sample folder",
         "description": null,
         "children": true,
         "interfaces": [],
         "scopes": [
            "resource",
            "metadata"
         ]
      },
      "resmeta": {
         "items": {}
      }
   },
   {
      "resource": {
         "id": 1037,
         "cls": "wmsserver_service",
         "parent": {
            "id": 640,
            "parent": {
               "id": 639
            }
         },
         "owner_user": {
            "id": 4
         },
         "permissions": [],
         "keyname": null,
         "display_name": "OpenDroneMap at NextGIS.com",
         "description": null,
         "children": false,
         "interfaces": [],
         "scopes": [
            "resource",
            "service",
            "metadata"
         ]
      },
      "resmeta": {
         "items": {}
      },
      "wmsserver_service": {
         "layers": [
            {
               "min_scale_denom": null,
               "keyname": "seneca_country",
               "display_name": "Seneca country",
               "max_scale_denom": null,
               "resource_id": 642
            }
         ]
      }
   }

.. _ngwdev_resource_properties

Resource properties
^^^^^^^^^^^^^^^^^^^^

To get resource properties execute the following request:

.. http:get:: /api/resource/(int:id)

   Resource properties.

**Example request**:

.. sourcecode:: http

   GET /api/resource/1 HTTP/1.1
   Host: ngw_url
   Accept: */*

**Example JSON response**:

.. sourcecode:: json

   {
    "resource": {
        "id": 2,
        "cls": "resource_group",
        "parent": {
            "id": 0,
            "parent": {
                "id": null
            }
        },
        "owner_user": {
            "id": 4
        },
        "permissions": [],
        "keyname": null,
        "display_name": "test",
        "description": "",
        "children": true,
        "interfaces": [],
        "scopes": [
            "resource",
            "metadata"
        ]
    },
    "resmeta": {
        "items": {}
    }
   }

Where:

* **resource** - resource description

   * id - resource identifier
   * cls - resource type (see. :ref:`ngwdev_resource_classes`)
   * parent - parent resource
   * owner_user - resource owner identifier
   * permissions - resource permissions array
   * keyname - unique identifier (allowed only ASCII characters). Must be unique in whole NextGIS Web instance
   * display_name - name showing in web user interface
   * description - resource description showing in web user interface
   * children - boolean value. True if resource has children resources
   * interfaces - API interfaces supported by resource
   * scope - which scope the resource is belongs

* **resmeta** - resource metadata

The map resource properties has the following json description:

.. sourcecode:: json

   {
    "resource": {
        "id": 1,
        "cls": "webmap",
        "parent": {
            "id": 2,
            "parent": {
                "id": 0
            }
        },
        "owner_user": {
            "id": 4
        },
        "permissions": [],
        "keyname": null,
        "display_name": "Main web map",
        "description": null,
        "children": false,
        "interfaces": [],
        "scopes": [
            "resource",
            "webmap",
            "metadata"
        ]
    },
    "webmap": {
        "extent_left": -180,
        "extent_right": 180,
        "extent_bottom": -90,
        "extent_top": 90,
        "draw_order_enabled": null,
        "bookmark_resource": null,
        "root_item": {
            "item_type": "root",
            "children": [
                {
                    "layer_adapter": "image",
                    "layer_enabled": true,
                    "draw_order_position": null,
                    "layer_max_scale_denom": null,
                    "item_type": "layer",
                    "layer_min_scale_denom": null,
                    "display_name": "Cities",
                    "layer_style_id": 91,
                    "layer_transparency": null
                },
                {
                    "group_expanded": false,
                    "display_name": "Points of interest",
                    "children": [
                     ],
                    "item_type": "group"
                }
            ]
        }
    },
    "basemap_webmap": {
        "basemaps": [
           {
                "opacity": null,
                "enabled": true,
                "position": 0,
                "display_name": "OpenStreetMap Standard",
                "resource_id": 665
            },
        ]
    },
    "resmeta": {
        "items": {}
    }
   }

Where:

* **resource** - resource description (see upper for details)
* **webmap** - web map description

   * extent_left, extent_right, extent_bottom, extent_top -
   * draw_order_enabled - use specific draw order or same as layers order
   * bookmark_resource - vector layer resource identifier
   * root_item - layers description group

      * item_type - always root
      * children - map layers and groups

         * layer_adapter - ``image`` or ``tile`` (also see :ref:`ngw_map_create`)
         * layer_enabled - is layer checked be default
         * draw_order_position - if drawing order is enabled this is position in order. May be ``null``.
         * layer_max_scale_denom, layer_min_scale_denom - a scale range in format ``1 : 10 000``
         * item_type - may be ``group`` or ``layer``
         * display_name - layer or group name
         * layer_style_id - vector or raster layer style resource identifier
         * layer_transparency - transparency
         * group_expanded - is group checked by default or not

* **basemap_webmap** - array of web map basemaps

   * opacity - basemap opacity
   * enabled - is basemap should be present in web map basemaps combobox
   * position - position in web map basemaps combobox
   * display_name - name showing in web map basemaps combobox
   * resource_id - basemap resource identifier

* **resmeta** - resource metadata

Feature count
^^^^^^^^^^^^^

To get feature count in vector layer execute the following request:

.. http:get:: /api/resource/(int:id)/feature_count

   Get feature count

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :>jsonobj long total_count: Feature count
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   GET /api/resoure/10/feature_count HTTP/1.1
   Host: ngw_url
   Accept: */*

**Example response**:

.. sourcecode:: json

   {
     "total_count": 0
   }

Get layer extent
^^^^^^^^^^^^^^^^^

To get layer extent execute following request. You can request extent for vector and raster layers.
Returned coordinates are in WGS84 (EPSG:4326) spatial reference.

.. http:get:: /api/resource/(int:id)/extent

   Get layer extent

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :>json jsonobj extent: extent json object
   :>jsonobj double minLat: Minimum latitude
   :>jsonobj double minLon: Minimum longtitude
   :>jsonobj double maxLat: Maximun latitude
   :>jsonobj double maxLon: Maximum longtitude
   :statuscode 200: no error

**Example request**:

.. sourcecode:: http

   GET /api/resoure/10/extent HTTP/1.1
   Host: ngw_url
   Accept: */*

**Example response**:

.. sourcecode:: json

    {
      "extent":
      {
        "minLat": 54.760400119987466,
        "maxLon": 35.08562149737197,
        "minLon": 35.06675807847286,
        "maxLat": 54.768358305249386
      }
    }

Features and single feature
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

To get a single feature of vector layer execute the following request:

.. http:get:: /api/resource/(int:id)/feature/(int:feature_id)

To get all vector layer features execute the following request:

.. http:get:: /api/resource/(int:id)/feature/

   Get features

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :>jsonarr features: features array
   :statuscode 200: no error

To get features using filters execute the following request:

.. versionadded:: 3.1

.. http:get:: /api/resource/(int:id)/feature/?limit=(int:limit)&offset=(int:offset)&intersects=(string:wkt_string)&fields=(string:field_name_1,string:field_name_2,...)&fld_{field_name_1}=(string:value)&fld_{field_name_2}=(string:value)&fld_{field_name_3}__ilike=(string:value)&fld_{field_name_4}__like=(string:value)

   Get features with parameters

   :reqheader Accept: must be ``*/*``
   :reqheader Authorization: optional Basic auth string to authenticate
   :param limit: limit feature count adding to return array
   :param offset: skip some features before create features array
   :param intersects: geometry as WKT string. Features intersect with this geometry will added to array
   :param fields: comma separated list of fields in return feature
   :param fld_{field_name_1}...fld_{field_name_N}: field name and value to filter return features. Parameter name forms as ``fld_`` + real field name (keyname). All pairs of field name = value form final ``AND`` SQL query.
   :param fld_{field_name_1}__{operation}...fld_{field_name_N}__{operation}: field name and value to filter return features using operation statement. Supported operations are: ``gt``, ``lt``, ``ge``, ``le``, ``eq``, ``ne``, ``like``, ``ilike``. All pairs of field name - operation - value form final ``AND`` SQL query.
   :>jsonarray features: features array
   :statuscode 200: no error

Filter operations:

* gt - greater (>)
* lt - lower (<)
* ge - greater or equal (>=)
* le - lower or equal (<=)
* eq - equal (=)
* ne - not equal (!=)
* like - LIKE SQL statement (for strings compare)
* ilike - ILIKE SQL statement (for strings compare)

To filter part of field use percent sign. May be at the start of a string, at the
end or both. Works only for ``like`` and ``ilike`` operations.

**Example request**:

.. sourcecode:: http

   GET api/resource/1878/feature/8 HTTP/1.1
   Host: ngw_url
   Accept: */*

**Example JSON response**:

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

**Example response with photo and description**:

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


**Example request with parameters**:

.. sourcecode:: http

   GET api/resource/442/feature/?fld_ondatr_set=3.0 HTTP/1.1
   Host: ngw_url
   Accept: */*

.. sourcecode:: http

   GET api/resource/442/feature/?intersects=POLYGON((4692730.0186502402648329%206500222.2378559196367859,4692731.0186502402648330%206500222.2378559196367859,4692730.0186502402648331%206500222.2378559196367861,4692730.0186502402648329%206500222.2378559196367861,4692730.0186502402648329%206500222.2378559196367859)) HTTP/1.1
   Host: ngw_url
   Accept: */*

.. sourcecode:: http

   GET api/resource/442/feature/?fld_dataunreal=2018-04-15&fields=Desman_ID,Year_1 HTTP/1.1
   Host: ngw_url
   Accept: */*

Attachment
^^^^^^^^^^^

Attachment URL forms from feature URL adding ``attachment/`` and attachment
identifier. For example:

.. http:get:: /api/resource/(int:id)/feature/(int:feature_id)/attachment/(int:attachment_id)/download

Attachment support loading any file types. For image files a preview generates
during upload.

.. http:get:: /api/resource/(int:id)/feature/(int:feature_id)/attachment/(int:attachment_id)/image?size=200x150

Map web interface
^^^^^^^^^^^^^^^^^^

.. versionadded:: 3.0

To get map web interface (not a map json representation) execute one of the
following request:

.. http:get:: resource/{0}/display

   Web map user interface.

**Example request**:

.. sourcecode:: http

   GET resource/42/display HTTP/1.1
   Host: ngw_url
   Accept: */*

To get web interface without layer control and toolbars execute the following
request:

.. http:get:: resource/{0}/display/tiny

   Web map ``light`` user interface.
