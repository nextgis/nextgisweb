# coding=utf-8
from sqlalchemy import event
from ..auth.models import User, Group
from .model import ResourceACLRule

settings_info = (
        dict(key='perm_cache.enable',       desc=u"Turn on permissions caching (default = False)"),
        dict(key='perm_cache.redis_path',   desc=u"Redis socket path (default = None)"),
        dict(key='perm_cache.redis_url',    desc=u"Redis server URL (default = localhost"),
        dict(key='perm_cache.redis_port',   desc=u"Redis server port (default = 6379)"),
        dict(key='perm_cache.redis_db',     desc=u"Redis DB (default = 0)"),
)


class PermissionCache:
    """Redis permission cache backend"""

    @classmethod
    def construct(cls, settings):

        import redis

        redis_path = settings.get('perm_cache.redis_path', None)
        redis_url = settings.get('perm_cache.redis_url', 'localhost')
        redis_port = settings.get('perm_cache.redis_port', 6379)
        redis_db = settings.get('perm_cache.redis_db', 0)

        try:
            redis_port = int(redis_port)
        except:
            redis_port = 6379

        try:
            redis_db = int(redis_db)
        except:
            redis_db = 0

        if redis_path:
            redis_inst = redis.Redis(unix_socket_path=None, db=redis_db)
        else:
            redis_inst = redis.Redis(host=redis_url, port=redis_port, db=redis_db)

        return PermissionCache(redis_inst)

    def __init__(self, redis):
        self.redis = redis

        # TODO: need more smart cache clean (only for user, only for group, for resource...)
        listener = lambda x, y, z: self.clear_cache()
        listen_types = (User, Group, ResourceACLRule)
        for listen_cls in listen_types:
            event.listen(listen_cls, 'after_delete', listener)
            event.listen(listen_cls, 'after_insert', listener)
            event.listen(listen_cls, 'after_update', listener)


    def get_cached_perm(self, resource, permission, user):
        try:
            key = '%s:%s:%s:%s' % (resource.id, user.id, permission.scope.identity, permission.name)
            res = self.redis.get(key)
            if res:
                return res == 'True'
            else:
                return None
        except:
            return None

    def add_to_cache(self, resource, permission, user, has_permission):
        try:
            key = '%s:%s:%s:%s' % (resource.id, user.id, permission.scope.identity, permission.name)
            self.redis.set(key, has_permission)
        except:
            pass

    def clear_cache(self):
        try:
            self.redis.flushdb()
        except:
            pass
