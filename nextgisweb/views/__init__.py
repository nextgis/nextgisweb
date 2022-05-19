def permalinker(model, route_name, keys=('id', )):
    def _permalink(model, request):
        return request.route_url(route_name, **dict(
            (k, getattr(model, k)) for k in keys
        ))

    model.permalink = _permalink
