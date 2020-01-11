# -*- coding: utf-8 -*-
from pkg_resources import resource_isdir, resource_listdir, resource_stream
import re

from sqlalchemy.orm.exc import NoResultFound

from ..lib.config import Option
from ..component import Component, require

from .models import Base, MarkerCollection, MarkerCategory, Marker

__all__ = [
    'MarkerLibraryComponent', 'MarkerCollection',
    'MarkerCategory', 'Marker'
]


class MarkerLibraryComponent(Component):
    identity = 'marker_library'
    metadata = Base.metadata

    @require('file_storage')
    def initialize_db(self):
        if self.options['sjjb']:
            self.load_collection('nextgisweb', 'marker_library/sjjb')

    def load_collection(self, package, path, keyname=None, display_name=None):
        if not keyname:
            keyname = path.split('/')[-1]
        if not display_name:
            display_name = keyname

        try:
            collection = MarkerCollection.filter_by(keyname=keyname).one()
        except NoResultFound:
            collection = MarkerCollection(
                keyname=keyname,
                display_name=display_name
            ).persist()

        for catname in resource_listdir(package, path):
            if not resource_isdir(package, path + '/' + catname):
                continue

            try:
                category = MarkerCategory.filter_by(keyname=catname).one()
            except NoResultFound:
                category = MarkerCategory(
                    keyname=catname,
                    display_name=catname
                ).persist()

            for fn in resource_listdir(package, path + '/' + catname):
                if not fn.endswith(('.svg', '.png')):
                    continue

                if resource_isdir(package, path + '/' + catname + '/' + fn):
                    continue

                mkeyname = re.sub(r'\.svg$|\.png$', '', fn)

                try:
                    marker = Marker.filter_by(keyname=mkeyname).one()

                    assert marker.collection == collection, \
                        "Marker '%s' found in collection '%s'!" \
                        % (mkeyname, marker.collection.keyname)

                    assert marker.category == category, \
                        "Marker '%s' found in category '%s'!" \
                        % (mkeyname, marker.category.keyname)

                except NoResultFound:
                    marker = Marker(
                        collection=collection,
                        category=category,
                        keyname=mkeyname,
                        display_name=mkeyname
                    ).persist()

                marker.load_file(resource_stream(
                    package, path + '/' + catname + '/' + fn
                ))

    option_annotations = (
        Option('sjjb', bool, False),
    )
