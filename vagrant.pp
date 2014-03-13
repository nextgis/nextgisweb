class { 'nextgisweb::libs': }

nextgisweb::venv { '/srv/ngw/env':
    sources => ['/vagrant',],
    require => Class['nextgisweb::libs'],
}

file { '/srv/ngw': ensure => directory }

nextgisweb::db { 'ngw': require => File['/srv/ngw'] }