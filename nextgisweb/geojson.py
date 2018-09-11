# -*- coding: utf-8 -*-
from __future__ import absolute_import

import geojson
import functools

from datetime import datetime, date, time
from decimal import Decimal
from geojson import GeoJSONEncoder


class Encoder(GeoJSONEncoder):
    # SQLAlchemy uses decimal.Decimal for numeric columns
    # and datetime.date for dates. geojson does
    # not know how to deal with objects of those types.
    # This class provides a simple encoder that can deal
    # with these kinds of objects.

    def default(self, obj):
        if isinstance(obj, (Decimal, date, datetime, time)):
            return str(obj)
        return GeoJSONEncoder.default(self, obj)


dumps = functools.partial(geojson.dumps, cls=Encoder)
loads = functools.partial(geojson.loads, cls=Encoder)
