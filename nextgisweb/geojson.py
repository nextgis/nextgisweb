# -*- coding: utf-8 -*-
from __future__ import absolute_import

import datetime
import decimal
import functools

from geojson import dumps as _dumps, loads as _loads
from geojson.codec import GeoJSONEncoder


class Encoder(GeoJSONEncoder):
    # SQLAlchemy's Reflecting Tables mechanism uses decimal.Decimal
    # for numeric columns and datetime.date for dates. Python json
    # doesn't deal with these types. This class provides a simple
    # encoder to deal with objects of these types.

    def default(self, obj):
        if isinstance(obj, (datetime.date, datetime.datetime, datetime.time)):
            return obj.isoformat()
        if isinstance(obj, decimal.Decimal):
            # The decimal is converted to a lossy float
            return float(obj)
        return GeoJSONEncoder.default(self, obj)


dumps = functools.partial(_dumps, cls=Encoder)
loads = functools.partial(_loads, cls=Encoder)
