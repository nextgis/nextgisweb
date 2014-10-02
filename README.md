Эта инструкция проверена и работает в Ubuntu Server 13.10, Ubuntu Server 12.04 LTS, Ubuntu Desktop 13.04, Ubuntu Server 14.04 LTS

## Установка

Для установки системы необходим Python 2.7:

### Подготовка базы данных

Подключить репозиторий ubuntugis ([поддерживаемые дистрибутивы](http://trac.osgeo.org/ubuntugis/wiki/SupportedDistributions)):

    $ sudo apt-add-repository ppa:ubuntugis/ppa
    $ sudo apt-get update
    $ sudo apt-get upgrade

Установить PostgreSQL:

    $ sudo apt-get install postgresql

Создаем пользователя, который будет упомянут в качестве database.user в config.ini (см. далее):

    $ sudo su postgres -c "createuser ngw_admin -P -e"

  после ввода пароля три раза говорим 'n'.

Создаем базу в которую будет развернут NGW, имя базы должно быть таким же как и database.name в config.ini (см. далее):

    $ sudo su postgres -c "createdb -O ngw_admin --encoding=UTF8 db_ngw"
    $ sudo gedit /etc/postgresql/9.1/main/pg_hba.conf

Отредактируем строку `local   all   all   peer` и приведём её к виду: `local   all   all   md5`

Не забудьте перезапустить сервис базы:

    $ sudo service postgresql restart

Установить PostGIS:

    $ sudo apt-cache search postgis
    
В полученном списке найдите пакет подходящий для вашей версии PostgreSQL, его имя должно иметь вид postgresql-{version}-postgis-{version} и установите его: 

    $ sudo apt-get install postgresql-9.1-postgis-2.0
    $ sudo su - postgres -c "psql -d db_ngw -c 'CREATE EXTENSION postgis;'"
    $ sudo su - postgres -c "psql -d db_ngw -c 'ALTER TABLE geometry_columns OWNER TO ngw_admin'"
    $ sudo su - postgres -c "psql -d db_ngw -c 'ALTER TABLE spatial_ref_sys OWNER TO ngw_admin'"
    $ sudo su - postgres -c "psql -d db_ngw -c 'ALTER TABLE geography_columns OWNER TO ngw_admin'"
    
  После этих операций будут созданы БД PostgreSQL с установленным в ней PostGIS и пользователь БД, который будет
  владельцем БД и таблиц `geometry_columns`, `georgaphy_columns`, `spatial_ref_sys`.

Убедитесь, что функции PostGIS появились в базе:

    $ psql -d db_ngw -U ngw_admin -c "SELECT PostGIS_Full_Version();"

### Подготовка базового ПО

Установить pip:

    $ sudo apt-get install python-pip

Установить virtualenv: 

    $ sudo pip install virtualenv

Установить дополнительные инструменты: 

    $ sudo apt-get install python-mapscript git libgdal-dev python-dev g++ libxml2-dev libxslt1-dev gdal-bin

Для большинства случаев ключи генерировать не нужно! Это необходимо при разработке.

Генерируем ключи для работы с GitHub (копируем и вставляем ключ в настройки пользователя GitHub в разделе SSH keys, https://github.com/settings/ssh):

    $ mkdir ~/.ssh
    $ cd ~/.ssh
    $ ssh-keygen -t rsa -C "your@email.com"
    $ cat id_rsa.pub
    $ cd ~

    
### Подготовка к установке NextGIS Web

Создаем рабочую папку `~/ngw`:

    $ mkdir ~/ngw
    $ mkdir ~/ngw/data
    $ mkdir ~/ngw/data/upload
    $ mkdir ~/ngw/backup   
    $ mkdir ~/ngw/data_storage
    $ cd ~/ngw


Клонируем репозиторий:

На гитхабе рекомендуют клонировать вот так (рекомендуется):
    $ git clone https://github.com/nextgis/nextgisweb.git
    
Также можно склонировать вот так:

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
параметров указано в комментариях. Имя и пароль пользователя, а так же пути к папкам хранения 
и загрузки файлов берутся из команд выше. Необходимо убедиться, что правильно указаны следующие параметры (значения приведены из примерах выше):

* database.name = db_ngw
* database.user =  ngw_admin
* database.password =
* secret =
* path = /home/sim/ngw/upload
* path = /home/sim/root/ngw/data_storage

Необходимо указывать абсолютные пути к папкам, %(here)s на данный момент не действует.

Так же для работы команд pserve или pshell потребуется конфигурационный файл paster, 
например `development.ini`. 

    $ gedit development.ini

Содержание:

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

Если предполагается работа в сети без доступа к Интернету, то в файле /nextgisweb/nextgisweb/webmap/basemaps.json нужно удалить записи про подложки Google.

### Инициализация БД

Инициализация БД выполняется следующим образом:

    $ env/bin/nextgisweb --config config.ini initialize_db

В некоторых случаях, например при обновлении, может потребоваться удалить все
существующие в БД данные и инициализировать БД повторно:

    $ env/bin/nextgisweb --config config.ini initialize_db --drop

### Запуск веб-сервера pserve:

    $ env/bin/pserve development.ini
    
Автозапуск
    
    $ sudo nano /etc/rc.local

    /home/zadmin/ngw/env/bin/pserve /home/zadmin/ngw/production.ini

    
В промышленной эксплуатации нужно использовать не pserve, а uWSGI. Далее смотри [DEPLOY.md](https://github.com/nextgis/nextgisweb/blob/2/DEPLOY.md)

## Обновление

    $ cd ~/ngw
    $ git pull
    $ env/bin/pip install -e nextgisweb
    $ env/bin/nextgisweb --config config.ini initialize_db

## Другое
### Авторизация
#### Имя и пароль по умолчанию

Имя: administrator
Пароль: admin

#### Права на просмотр

В качестве группы "Пользователи" нужно использовать системного пользователя "Прошедний проверку". При проверке прав этот пользователь соответствует любому пользователю, прошедшему аутентификацию.

## Ошибки и предупреждения

Несущественное предупреждение:

     ault.py:471: SAWarning: Unicode type received non-unicode bind param value.
     processors[key](compiled_params[key])
 
### Фичи

На данный момент при добавлении двух слоёв с одинаковым названием возникает ошибка.

При добавлении слоя из PostGIS сейчас нужно указать проекцию EPSG:3857

При миграции рекомендуется копировать тематические данные из баз PostGIS следующим образом:
1. В девелоперской сборке программы NextGIS Manager перетащить через drag-and-drop по одной схеме между базами.
2. В PgAdmin выставить для скопированых схем права на чтение для public (или для пользователя БД под которым обращается NextGISWeb) 
 

Импорт картостилей из qml с условиями сейчас работает некорректно. После импорта нужно немного изменить стиль вручную. Так же устарела инструкция.
Непустое условие в картостиле пишется так:  <expression>"птицы"</expression>
Пустое условие в картостиле пишется так: <expression>''</expression>

Пример работающего картостиля с условиями:
```
<map>
  <layer>
    <classitem>Group</classitem>
    <class>
      <expression>''</expression>
      <style>
        <width>10.9417322835</width>
        <color red="179" green="146" blue="251"/>
        <linecap>square</linecap>
        <linejoin>bevel</linejoin>
        <!-- Остались необработанные атрибуты: offset_unit, draw_inside_polygon, width_unit, customdash_unit, customdash_map_unit_scale, offset_map_unit_scale, width_map_unit_scale -->
      </style>
    </class>
    <class>
      <expression>"млекопитающие"</expression>
      <style>
        <width>10.9417322835</width>
        <color red="82" green="193" blue="119"/>
        <linecap>square</linecap>
        <linejoin>bevel</linejoin>
        <!-- Остались необработанные атрибуты: offset_unit, draw_inside_polygon, width_unit, customdash_unit, customdash_map_unit_scale, offset_map_unit_scale, width_map_unit_scale -->
      </style>
    </class>
    <class>
      <expression>"насекомые"</expression>
      <style>
        <width>10.9417322835</width>
        <color red="139" green="75" blue="64"/>
        <linecap>square</linecap>
        <linejoin>bevel</linejoin>
        <!-- Остались необработанные атрибуты: offset_unit, draw_inside_polygon, width_unit, customdash_unit, customdash_map_unit_scale, offset_map_unit_scale, width_map_unit_scale -->
      </style>
    </class>
    <class>
      <expression>"птицы"</expression>
      <style>
        <width>10.9417322835</width>
        <color red="55" green="90" blue="205"/>
        <linecap>square</linecap>
        <linejoin>bevel</linejoin>
        <!-- Остались необработанные атрибуты: offset_unit, draw_inside_polygon, width_unit, customdash_unit, customdash_map_unit_scale, offset_map_unit_scale, width_map_unit_scale -->
      </style>
    </class>
  </layer>
</map>
```






### В случае ошибки

* sqlalchemy.exc.ProgrammingError: (ProgrammingError) permission denied for database zapoved_ore_ngw
  Пользователю не хватает прав в базе. Он должен быть владельцем базы, и таблиц, см. в начале инструкции

* KeyError: 'database.host'
  Опечатка в конфиге

* OSError: [Errno 13] Permission denied: '/home/trolleway/ngw_ore/data_storage/raster_layer/79'
  Выставите права на запись растров в data_storage используя sudo mc
  sudo chmod 755 -R ./data_storage
