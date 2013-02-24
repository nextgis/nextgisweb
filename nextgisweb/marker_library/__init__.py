# -*- coding: utf-8 -*-
from pkg_resources import resource_isdir, resource_listdir, resource_stream
import re

from sqlalchemy.orm.exc import NoResultFound

from ..component import Component, require


@Component.registry.register
class MarkerLibraryComponent(Component):
    identity = 'marker_library'

    @require('file_storage')
    def initialize(self):
        super(MarkerLibraryComponent, self).initialize()

        from . import models
        models.initialize(self)

    @require('file_storage')
    def initialize_db(self):
        self.load_collection('nextgisweb', 'marker_library/sjjb')

    def load_collection(self, package, path, keyname=None, display_name=None):
        if not keyname:
            keyname = path.split('/')[-1]
        if not display_name:
            display_name = keyname

        collection = self.MarkerCollection(
            keyname=keyname,
            display_name=display_name
        ).persist()

        for catname in resource_listdir(package, path):
            if not resource_isdir(package, path + '/' + catname):
                continue

            try:
                category = self.MarkerCategory.filter_by(keyname=catname).one()
            except NoResultFound:
                category = self.MarkerCategory(
                    keyname=catname,
                    display_name=catname
                ).persist()

            for fn in resource_listdir(package, path + '/' + catname):
                if not fn.endswith('.svg'):
                    continue

                if resource_isdir(package, path + '/' + catname + '/' + fn):
                    continue

                mkeyname = re.sub(r'\.svg$', '', fn)

                try:
                    marker = self.Marker.filter_by(keyname=mkeyname).one()

                    assert marker.collection == collection, \
                        "Marker '%s' found in collection '%s'!" \
                        % (mkeyname, marker.collection.keyname)

                    assert marker.category == category, \
                        "Marker '%s' found in category '%s'!" \
                        % (mkeyname, marker.category.keyname)

                except NoResultFound:
                    marker = self.Marker(
                        collection=collection,
                        category=category,
                        keyname=mkeyname,
                        display_name=mkeyname
                    ).persist()

                marker.load_file(resource_stream(
                    package, path + '/' + catname + '/' + fn
                ))
