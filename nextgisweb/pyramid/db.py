import transaction

from nextgisweb.env import DBSession


def tween_factory(handler, registry):
    skip_tm_path_info = (
        "/static/",
        "/favicon.ico",
        "/api/component/pyramid/route",
    )

    def activate_hook(request):
        return not request.path_info.startswith(skip_tm_path_info)

    def tween(request):
        if not activate_hook(request):
            return handler(request)

        manager = transaction.manager
        manager.begin()
        try:
            response = handler(request)
            manager.commit()
        except Exception:
            manager.abort()
            raise
        finally:
            DBSession.remove()
        return response

    return tween
