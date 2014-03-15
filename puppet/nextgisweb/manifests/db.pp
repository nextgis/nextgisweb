define nextgisweb::db ($password = "") {

    class { 'postgresql::server': }

    Postgresql_psql {
        psql_user => $postgresql::server::user,
        psql_group => $postgresql::server::group,
        psql_path => $postgresql::server::psql_path,
    }

    postgresql::server::db { $name:
        user => $name,
        encoding => "UTF-8",
        password => postgresql_password($name, $password),
    }

    $pgversion = $postgresql::server::version
    package { "postgresql-${pgversion}-postgis": ensure => installed }

    postgresql_psql { "${name} postgis":
        db => $name,
        command => "
            CREATE EXTENSION postgis;
            ALTER TABLE spatial_ref_sys OWNER TO ${name};
            ALTER VIEW geometry_columns OWNER TO ${name};
            ALTER VIEW geography_columns OWNER TO ${name};
            ALTER VIEW raster_columns OWNER TO ${name};
            ALTER VIEW raster_overviews OWNER TO ${name};
        ",
        unless => "SELECT * FROM pg_tables WHERE tablename = 'spatial_ref_sys'",
        require => [
            Postgresql::Server::Db[$name],
            Package["postgresql-${pgversion}-postgis"],
        ]
    }
}