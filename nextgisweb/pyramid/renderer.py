import datetime

from pyramid.renderers import JSON


def datetime_adapter(obj, request):
    return obj.isoformat()


json_renderer = JSON()
json_renderer.add_adapter(datetime.date, datetime_adapter)
json_renderer.add_adapter(datetime.datetime, datetime_adapter)
json_renderer.add_adapter(datetime.time, datetime_adapter)
