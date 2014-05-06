## Установка

Для установки системы необходимы:

* Python 2.7 и пакет virtualenv
* БД PostgreSQL 9.1 с установленным в ней PostGIS 2.0, пользователь БД должен быть
  владельцем БД и таблиц `geometry_columns`, `georgaphy_columns`, `spatial_ref_sys`.

### Подготовка

Установить pip:

    $ sudo apt-get install python-pip

Установить virtualenv: 

    $ sudo pip install virtualenv

Установить дополнительные инструменты: 

    $ sudo apt-get install python-mapscript
    $ sudo apt-get install git
    $ sudo apt-get install libgdal-dev
    $ sudo apt-get install python-dev
    $ sudo apt-get install g++
    $ sudo apt-get install libxml2-dev libxslt1-dev

Генерируем ключи для работы с GitHub:

    $ cd ~/.ssh
    $ ssh-keygen -t rsa -C "your@email.com"
    $ cat id_rsa.pub #(копируем и вставляем ключ в настройки пользователя GitHub в разделе SSH keys, https://github.com/settings/ssh)
    $ cd ~

Создаем пользователя, который будет упомянут в качестве database.user в config.ini (см. далее):

    $ sudo su postgres
    $ createuser zadmin -P
    
Создаем базы в которую будет развернут NGW, имя базы должно быть таким же как и database.name в config.ini (см. далее):

    $ createdb -U zadmin zapoved_ngw
    $ createdb -U zadmin -T template_postgis zapoved_ngw

### Подготовка к установке NextGIS Web

Создаем рабочую папку `~/ngw`:

    $ mkdir ~/ngw
    $ mkdir ~/ngw/data
    $ mkdir ~/ngw/data/upload
    $ cd ~/ngw

Клонируем репозиторий:

    $ git clone git@github.com:nextgis/nextgisweb.git

Создаем виртуальное окружение virtualenv в папке `~/ngw/env` (папка создастся сама после выполнения команды):

    $ virtualenv --no-site-packages env

### Установка NextGIS Web

Устанавливаем пакет NextGIS Web в режиме разработки, при этом будут установлены все необходимые пакеты:

    $ env/bin/pip install -e ./nextgisweb

### Установка NextGIS Web MapServer

Установка nextgisweb_mapserver подробно описана [тут](https://github.com/nextgis/nextgisweb_mapserver).


### Конфигурационный файл

Конфигурационный с параметрами по-умолчанию может быть создан при помощи
команды `nextgisweb-config`:

    $ env/bin/nextgisweb-config > config.ini

В результате будет создан конфигурационный файл `config.ini`. В этот текcтовый
файл нужно внести изменения в соответствии со своим окружением. Назначение
параметров указано в комментариях. Имя и пароль пользователя, а так же пути к папкам хранения и загрузки файлов берутся из команд выше. Необходимо указывать абсолютные пути к папкам.

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
    
Обновлённая версия руководства пользователя - в вики    
