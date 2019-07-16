# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function

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
