В основе этого списка лежит спецификация: 
    09-025r1_OGC_Web_Feature_Service_WFS_2.0_ISOFDIS_19142_Geographic_information_-_Web_Feature_Service

Список основных функций, которые должны быть реализованы приводятся в 
Table 1 — Conformance classes на странице 16.

Ориентируемся на реализацию Transactional WFS и все низлежащие модификации WFS.

Для этого должны быть реализованы следующие операторы:

* GetCapabilities
* DescribeFeatureType
* ListStoredQueries
* DescribeStoredQueries
* GetFeature with the Query action and the GetPropertyValue operation.

Кроме этого "server shall conform to at least one of the"

* HTTP GET (нет), 
* HTTP POST (есть),
* SOAP (нет)
conformance classes


## Отсустсвующие на сейчас возможности:

* GetCapabilities: добавить WSDL section (optional), Filter capabilities 
section (mandatory).
* DescribeFeatureType: на каждую новую добавленную возможность нужно добавить 
описание.
* GetPropertyValue: нет совсем.
* Query Action для GetFeature: не реализовано.
* ListStoredQueries: не реализовано.
* DescribeStoredQueries: не реализовано.


## Оценочное время.
Основное время уйдет на реализацию запросов (Stored Queries):

Stored query operations allow clients to create, drop, list and described 
parameterized query expressions that are stored by the server and can be 
repeatedly invoked using different parameter values.


В частности, там нужно реализовать специфический язык запросов, а потом
по этому языку запросов организовать выборки данных. По сравнению с этой
функциональностью, другими недостающими функциональностями, можно пренебречь,
поскольку время на реализацию этих функций "потеряется" во времени реализации
Stored Queries. Если заниматься только этим и ничем другим, то на реализацию 
уйдет:

* оптимистично: неделя
* более-менее реалистично: от двух недель до месяца
* пессемистично: до полутора месяцев.



