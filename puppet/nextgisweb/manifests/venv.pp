define nextgisweb::venv ($sources, $user = "root") {

    package { "python-virtualenv": ensure => installed }

    exec { 'virtualenv ${name}':
        command => "su ${user} -c \"/usr/bin/virtualenv --no-site-packages ${name}\"",
        path => "/bin:/usr/bin",
        cwd => "/tmp",
        creates => $name,
        require => Package['python-virtualenv'],
    }

    nextgisweb::venv::source { $sources:
        venv => $name,
        user => $user,
        require => Exec['virtualenv ${name}'],
    }

}

define nextgisweb::venv::source($venv = undef, $user = undef) {

    exec { "nextgisweb::venv::source ${venv} ${name}":
        command => "su ${user} -c \"export; ${venv}/bin/pip install -e ${name}\"",
        path => "/bin:/usr/bin",
        timeout => 1200,
        loglevel => debug
    }

}

