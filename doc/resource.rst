Ресурсы
=======

..  automodule:: nextgisweb.resource.scope
    :members:

HTTP API
--------

..  http:get:: /api/resource/{id}

    Получить JSON представление ресурса. Для вызова этого метода необходимо как минимум право чтения ресурса.

..  http:put:: /api/resource/{id}

    Изменить ресурс в соответствии с переданным JSON. Так же необходимо право чтения ресурса.

..  http:delete:: /api/resource/{id}

    Удалить ресурс.

..  http:get:: /api/resource/

    Выбрать ресурсы и получить JSON.

    :param integer parent: Идентификатор ресурса-родителя.

..  http:post:: /api/resource/

    Создать ресурс в соответствии с JSON.

    :param integer parent: Идентификатор ресурса-родителя, так же может быть передан в JSON.
    :param string cls: Идентификатор класса создаваемого ресурса.
