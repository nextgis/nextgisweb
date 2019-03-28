import sys

from ngwdocker import PackageBase

class Package(PackageBase):

    def debpackages(self):
        return (
            'libgdal-dev',
            'libgeos-dev',
            'gdal-bin',
            'g++',
            'libxml2-dev',
            'libxslt1-dev',
            'zlib1g-dev',
            'libjpeg-turbo8-dev',
            'nodejs',
            'postgresql-client',
            'libmagic-dev',
        )
