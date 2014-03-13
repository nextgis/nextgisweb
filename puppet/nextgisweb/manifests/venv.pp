define nextgisweb::venv (
    $sources = []
) {

    file { $name: ensure => directory }

    package { "python-virtualenv": ensure => installed }

    python::virtualenv { $name:
        distribute => false,
        require => [
            File[$name],
            Package['python-virtualenv']
        ]
    }

    nextgisweb::venv::source { $sources:
        venvname => $name,
    }

}

define nextgisweb::venv::source($venvname = undef) {

    exec { "nextgisweb::venv::source ${venvname} ${name}":
        command => "${venvname}/bin/pip install -e ${name}",
        require => Python::Virtualenv[$venvname],
        timeout => 1200,
    }

}

