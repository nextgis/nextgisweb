## Установка

Для установки системы необходимы:

* Python 2.7 и пакет virtualenv
* БД PostgreSQL 9.1 с установленным в ней PostGIS 2.0, пользователь БД должен быть
  владельцем БД и таблиц `geometry_columns`, `georgaphy_columns`, `spatial_ref_sys`.

### Установка пакета

Создаем рабочую директорию `~/ngw`:
    
    $ mkdir ~/ngw
    $ cd ~/ngw

Клонируем репозиторий:

    $ git clone git@github.com:nextgis/nextgisweb.git

Создаем виртуальное окружение virtualenv в директории `~/ngw/env`:

    $ virtualenv --no-site-packages env

Два пакета, необходимых для работы системы, в автоматическом режиме не
устанавливаются, поэтому их нужно установить вручную: GDAL и mapscript.

Устанавливаем GDAL. Прежде всего необходимо проверить версию GDAL, установленную
в системе:

    $ gdalinfo --version

А также определить директорию с заголовочными файлами GDAL:

    $ locate include | grep gdal.h

Устанавливаем GDAL необходимой версии (пример установки на сервере
NextGIS):

    $ env/bin/pip install --no-install GDAL==1.8.1
    $ cd env/build/GDAL
    $ env/bin/python setup.py build_ext --include-dirs="/usr/local/include/"
    $ env/bin/pip install install --no-download GDAL

В дистрибутивах на базе Debian заголовочные файлы вероятнее всего будут
в директории `/usr/include/gdal/`.

Устанавливаем mapscript. mapscript должен быть установлен в системе, для
того чтобы обеспечить его функционал в виртуальном окружении, выполняем следующие
шаги (пример установки на сервере NextGIS):

    $ cp -r `python -c "import mapscript, os.path; print os.path.split(mapscript.__file__)[0]"` env/lib/python2.7/site-packages/mapscript.egg
    $ echo "./mapscript.egg" > env/lib/python2.7/site-packages/mapscript.pth

Устанавливаем пакет в режиме разработки, при этом будут установлены все необходимые пакеты:

    $ env/bin/pip install -e ./nextgisweb

### Конфигурационный файл

Конфигурационный с параметрами по-умолчанию может быть создан при помощи
команды `nextgisweb-config`:

    $ env/bin/nextgisweb-config > config.ini

В результате будет создан конфигурационный файл `config.ini`. В этот текcтовый
файл нужно внести изменения в соответствии со своим окружением. Назначение
параметров указано в комментариях.

Так же для работы команд pserve или pshell потребуется конфигурационный файл paster, 
например `development.ini`. Его можно создать в любом тектовом редакторе:

    [app:main]
    use = egg:nextgisweb

    # путь к основному конфигурационному файлу
    config = %(here)s/config.ini
    
    # путь к конфигурационному файлу библиотеки logging
    # logging = %(here)s/logging.ini

    # полезные для отладки параметры
    # pyramid.reload_templates = true
    # pyramid.includes = pyramid_debugtoolbar

    [server:main]
    use = egg:waitress#main
    host = 0.0.0.0
    port = 6543


### Инициализация БД

Инициализация БД выполняется следующим образом:

    $ env/bin/nextgisweb --config config.ini initialize_db

В некоторых случаях, например при обновлении, может потребоваться удалить все
существующие в БД данные и инициализировать БД повторно:

    $ env/bin/nextgisweb --config config.ini initialize_db --drop


### Запуск веб-сервера pserve:

    $ env/bin/pserve development.ini
