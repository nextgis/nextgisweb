from .util import push_stacklevel


class RouteHelper:
    def __init__(self, name, config, *, deprecated=False):
        self.config = config
        self.name = name
        self.deprecated = deprecated

    def add_view(self, view=None, **kwargs):
        push_stacklevel(kwargs, True)

        if "route_name" not in kwargs:
            kwargs["route_name"] = self.name

        deprecated = kwargs.pop("deprecated", self.deprecated)
        self.config.add_view(view=view, deprecated=deprecated, **kwargs)

        return self

    def head(self, *args, **kwargs):
        push_stacklevel(kwargs, True)
        return self.add_view(*args, request_method="HEAD", **kwargs)

    def get(self, *args, **kwargs):
        push_stacklevel(kwargs, True)
        return self.add_view(*args, request_method="GET", **kwargs)

    def post(self, *args, **kwargs):
        push_stacklevel(kwargs, True)
        return self.add_view(*args, request_method="POST", **kwargs)

    def put(self, *args, **kwargs):
        push_stacklevel(kwargs, True)
        return self.add_view(*args, request_method="PUT", **kwargs)

    def delete(self, *args, **kwargs):
        push_stacklevel(kwargs, True)
        return self.add_view(*args, request_method="DELETE", **kwargs)

    def options(self, *args, **kwargs):
        push_stacklevel(kwargs, True)
        return self.add_view(*args, request_method="OPTIONS", **kwargs)

    def patch(self, *args, **kwargs):
        push_stacklevel(kwargs, True)
        return self.add_view(*args, request_method="PATCH", **kwargs)
