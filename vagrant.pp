$rootdir = "/srv/ngw"

class { 'nextgisweb::libs': }

nextgisweb::venv { "${rootdir}/env":
    sources => ['/vagrant', ],
    user => vagrant,
    require => Class['nextgisweb::libs'],
}

file { "${rootdir}": ensure => directory, owner => vagrant }

nextgisweb::db { 'ngw': password => 'vagrant' }

$preseed_ini = "[core]
database.name = ngw
database.host = localhost
database.user = ngw
database.password = vagrant

[pyramid]
secret = vagrant

[file_storage]
path = ${rootdir}/data/file_storage

[file_upload]
path = ${rootdir}/data/file_upload"

file { "${rootdir}/preseed.ini":  ensure => file, content => $preseed_ini, owner => vagrant }

$pserve_ini = "[app:main]
use = egg:nextgisweb
config = %(here)s/config.ini

[server:main]
use = egg:waitress#main
host = 0.0.0.0
port = 5000"

file { "${rootdir}/pserve.ini": ensure => file, content => $pserve_ini, owner => vagrant }

file { "${rootdir}/data": ensure => directory, owner => vagrant, require => File["${rootdir}"] }
file { "${rootdir}/data/file_storage": ensure => directory, owner => vagrant, require => File["${rootdir}/data"]}
file { "${rootdir}/data/file_upload": ensure => directory, owner => vagrant, require => File["${rootdir}/data"]}

exec { 'nextgisweb-config':
    command => "${rootdir}/env/bin/nextgisweb-config --no-comments --preseed preseed.ini > config.ini",
    cwd => "${rootdir}",
    require => [
        File["${rootdir}/preseed.ini"],
        File["${rootdir}/data/file_upload"],
        File["${rootdir}/data/file_storage"],
        Nextgisweb::Venv["${rootdir}/env"],
        Nextgisweb::Db["ngw"],
    ]
}

exec { 'nextgisweb initialize_db':
    command => "${rootdir}/env/bin/nextgisweb --config ${rootdir}/config.ini initialize_db",
    require => Exec['nextgisweb-config'],
}