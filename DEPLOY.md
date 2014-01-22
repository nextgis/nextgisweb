uWSGI
=====

К существующему конфигурационном ini-файлу paste добавляем секцию `uwsgi`

```
[uwsgi]
module = nextgisweb.uwsgiapp
env = PASTE_CONFIG=%p
```

При использовании FreeBSD может потребоваться отключить WSGI file wrapper, так как он иногда работает некорректно. Для этого в этой же секции:

```
env = WSGI_FILE_WRAPPER=no
```

Далее, в зависимости от того, какой интерфейс требуется на выходе от uwsgi. Тут есть некоторая путаница, связаная с тем, что uwsgi это одновременно и протокол и программа. Ниже речь идет именно о протоколе.

HTTP:

    socket = host:port | :port
    protocol = http

uWSGI:

    socket = host:port | :port | /path/to/socket
    protocol = uwsgi

FastCGI:

    socket = host:port | :port | /path/to/socket
    protocol = fastcgi

При использовании сокета в файловой системе права на него могут быть выставлены через параметр chmod:

    chmod = 777

Количество процессов задается параметром `workers`, а количество потоков в процессе - параметром `thread`. В примере ниже будет запущено 2 процесса с 4 потоками в каждом:

    workers = 2
    threads = 4

Вариант с отдельным процессами более безопасный, но и более ресурсоемкий.

Запуск uwsgi осуществляется командой `uwsgi file.ini`, причем все переменные могут быть так же переопределены из командной строки, например так: `uwsgi --workers=8 file.ini`. В таком же виде uwsgi можно запускать и через supervisor, например так:

    [program:nextgisweb]
    command = /path/to/uwsgi /path/to/file.ini


# apache + mod_uwsgi

При наличии модуля `mod_uwsgi` uwsgi можно подключить при помощи такой конструкции:

    <Location /nextgisweb>
        SetHandler uwsgi-handler
        uWSGISocket /path/to/socket
    </Location>

В этом случае для коммуникации между uwsgi и apache используется сокет в файловой системе, то есть в секции `[uwsgi]` должно быть:

    socket = /path/to/socket
    protocol = uwsgi

К сожалению, при использовании этого модуля не работают всякие фишки, вроде сжатия gzip на стороне apache. Более того они могут привести к совершенно неожиданным последствиям.


# apache + mod_proxy_uwsgi

При наличии модуля `mod_proxy_uwsgi` uwsgi можно подключить при помощи такой конструкции:

    <Location /nextgisweb>
        ProxyPass uwsgi://localhost:10001
    </Location>

Порт приходится использовать из-за того, что `mod_proxy` в apache не поддерживает сокеты из файловой системы. То есть в этом случае в `[uwsgi]` должно быть что-то вроде:

    socket = localhost:10001
    protocol = uwsgi
