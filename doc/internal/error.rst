Error handling
==============

Backend
-------

Any exception that needs to be reported to the user must implement
interface :class:`nextgisweb.core.exception.IUserException`. It can be
done via subclassing exception from base exception classes from
:mod:`nextgisweb.core.exception` module or per object basis via
:meth:`nextgisweb.core.exception.user_exception` method.

Exception can provide following attributes:

:attr:`~nextgisweb.core.exception.title`
    General error description.

:attr:`~nextgisweb.core.exception.message`
    User friendly and secure message describing error.

:attr:`~nextgisweb.core.exception.detail`
    Information about fixing problem in Web GIS context.

:attr:`~nextgisweb.core.exception.http_status_code`
    Corresponding HTTP 4xx or 5xx status code.

:attr:`~nextgisweb.core.exception.data`
    Error specific JSON-serializable dictionary.

**TODO:** Add base exception classes

**TODO:** Add examples

Webserver and API
-----------------

Pyramid component handles exception wich provides
:class:`~nextgisweb.core.exception.IUserException` and processes them with
following rules:

1. For API and XHR requests JSON representation returned. API requests
   identified by ``/api/`` path and XHR requests identified by
   ``X-Requested-With`` HTTP header.

2. For other requests HTML representation returned. HTML representation is
   rendered by ``nextgisweb:pyramid/template/error.mako`` template.

Exceptions that doesn't support interface
:class:`~nextgisweb.core.exception.IUserException` wrapped into
:class:`nextgisweb.pyramin.exception.InternalServerError` wich support this
interface, so they can be handle same way.

Titles, messages and details of exception are translated to request locate so
you can use localized strings and i18n framework.

JSON representation
^^^^^^^^^^^^^^^^^^^

**TODO:** Add schema and example

Frontend
--------

Сlass ``ngw-pyramid/ErrorDialog`` is designed to show modal dialog with an
error message:

.. code-block:: javascript

    require(["ngw-pyramid/ErrorDialog"], function (ErrorDialog) {
        // ...
        if (somethingWentWrong) {
            new ErrorDialog({
                title: i18n.gettext("Unexpected error"),
                message: i18.gettext("Something went wrong."),
                detail: i18.gettext("Please try again later.")
            }).show()
        }
    })

ErrorDialog can also accept ``dojo/request/xhr`` errors:

.. code-block:: javascript

    require([
        "dojo/request/xhr",
        "ngw-pyramid/ErrorDialog"
    ], function (
        xhr,
        ErrorDialog
    ) {
        xhr(API_URL, {
            requestMethod: 'GET',
            handleAs: 'json'
        }).then(
            function (data) { /* everything is alright */ },
            function (err) {
                new ErrorDialog({
                    response: err
                }).show()
            }
        )
    })
