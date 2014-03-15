# Класс для установки необходимых библиотек, большинство из которых
# можно довольно просто вычислить через apt-get build-dep python-bar

class nextgisweb::libs {

    # GCC и компания нужны для сборки пакетов pip
    package { "build-essential": ensure => installed }

    # Заголовочные файлы python нужны для сборки других пакетов
    package { "python-dev": ensure => installed }

    # common
    $common_deps = ["zlib1g-dev"]
    package { $common_deps: ensure => installed }
    
    # psycopg2
    $psycopg2_deps = ["libpq-dev"]
    package { $psycopg2_deps: ensure => installed }

    # lxml
    $lxml_deps = ["libxml2-dev", "libxslt1-dev"]
    package { $lxml_deps: ensure => installed }

    # pillow / pil
    $pillow_deps = ["libfreetype6-dev", "libjpeg8-dev", "liblcms1-dev"]
    package { $pillow_deps: ensure => installed }

    # pygdal / gdal
    package { "libgdal1-dev": ensure => installed }

}