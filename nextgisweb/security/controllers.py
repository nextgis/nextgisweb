# -*- coding: utf-8 -*-


def setup_pyramid(comp, config):
    DBSession = comp.env.core.DBSession

    ACL, ACLItem = comp.ACL, comp.ACLItem

    class ACLController(object):

        def __init__(
            self, resource,
            route_name='%(resource)s.acl',
            pattern='%(resource)s/{id:\d+}/acl',
            permission='%(resource)s:acl',
        ):
            self._resource = resource
            self._route_name = route_name
            self._pattern = pattern
            self._permission = permission

            self._resource_name = comp.resource_name(resource)

        @property
        def route_name(self):
            return self._route_name % dict(resource=self._resource_name)

        @property
        def pattern(self):
            return self._pattern % dict(resource=self._resource_name)

        def includeme(self, config):
            config.add_route(self.route_name, self.pattern) \
                .add_view(self.view_get, request_method='GET', renderer='security/acl.mako') \
                .add_view(self.view_post, request_method='POST', renderer='json')

        def view_get(self, request):
            obj = self.context(request)
            acl_items = [
                dict(
                    principal_id=i.principal_id,
                    resource=i.resource,
                    permission=i.permission,
                    operation=i.operation,
                    # Доп. поля для отображения
                    principal_cls=i.principal.cls,
                    principal_keyname=i.principal.keyname,
                    principal_display_name=i.principal.display_name,
                )
                for i in obj.acl.items
            ]

            return dict(
                obj=obj,
                acl_items=acl_items,
                resource=obj.acl.resource,
                subtitle=u"Управление доступом"
            )

        def view_post(self, request):
            obj = self.context(request)
            acl = obj.acl

            def iteritems():
                for r in request.json_body:
                    yield (
                        r['principal_id'], r['resource'],
                        r['permission'], r['operation']
                    )

            acl.update(iteritems(), replace=True)

        def context(self, request):
            return DBSession.query(self._resource) \
                .filter_by(**request.matchdict).one()


    # @model_context(ACL)
    # def edit_acl_post(request, obj):
    #     new_items = dict()

    #     for r in request.json_body:
    #         pk = (obj.id, r['principal_id'], r['resource'], r['permission'])
    #         new_items[pk] = r['operation']

    #     # Исправляем существующие записи
    #     seen = set()
    #     for item in obj.items:
    #         pk = (item.acl_id, item.principal_id, item.resource, item.permission)
    #         if pk in new_items:
    #             item.operation = new_items[pk]
    #             seen.add(pk)
    #         else:
    #             DBSession.delete(item)

    #     # Добавляем новые
    #     for pk, operation in new_items.iteritems():
    #         if pk not in seen:
    #             print pk
    #             obj.items.append(ACLItem(
    #                 **dict(zip(
    #                     ('acl_id', 'principal_id', 'resource', 'permission'),
    #                     pk
    #                 ), operation=operation)
    #             ))

    comp.ACLController = ACLController
