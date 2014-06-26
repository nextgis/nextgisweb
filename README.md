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

    $ sudo apt-get install python-mapscript git libgdal-dev python-dev g++ libxml2-dev libxslt1-dev

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
и загрузки файлов берутся из команд выше. 
Необходимо указывать абсолютные пути к папкам, %(here)s на данный момент не действует.

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

### Пароль по умолчанию

administrator/admin


     ault.py:471: SAWarning: Unicode type received non-unicode bind param value.
     processors[key](compiled_params[key]) - ошибкой не считается
 
### Подготовка растров с прозрачностью
Откройте растр в ArcMap.

Панель "Рисование" - нарисуйте многоугольник по границам растра, вырезав поля.

Посмотрите его гистограмму, и выберите одно из значений, в котором все каналы показываются по нулям.

Выделите растр в списке слоёв - Экспорт данных.

экстент выбранной графики (вырезание) - включить.

RGB - включить.

Значение NoData - то, которое посмотрели на гистограмме.

Дождитесь окна "Добавить получившийся слой на карту?". Только после его закрытия файл закрывается.

На этом этапе у вас получится растр с тремя каналами.

Выполните gdalwarp на клиентской машине

    $ C:\NextGIS_QGIS\bin\gdalwarp.exe --config GDAL_DATA "C:\NextGIS_QGIS\share\gdal" -t_srs EPSG:3857 -multi -dstalpha -dstnodata none -wo "UNIFIED_SRC_NODATA=YES" c:\temp\ast_20000710_023050_mul29.tif c:\temp\rgba.tif
    
Если у вас не находится gcs.csv, то включите в комманду ключ с сылкой на каталог QGIS.

    --config GDAL_DATA "C:\NextGIS_QGIS\share\gdal"    
gdalwarp не может перезаписывать конечный файл, даже с ключом --overwrite, и сыплет странными ошибками "JPEGLib:Bogus input colorspace WriteEncodedTile/Strip() failed. ". В таком случае удалите конечный файл.

На этом этапе у вас получится растр с четыремя каналами. Вы можете загрузить его в NextGIS WEB, и у него будет правильно работать прозрачность. 

Если будете добавлять полученный слой в QGIS, то Свойства слоя-Прозрачность-No Data Value - выключить.

