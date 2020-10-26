# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals


def test_disable_resources(
    ngw_env, ngw_webtest_app,
    ngw_auth_administrator, ngw_resource_group
):
    def create_resource_group(display_name, expected_status):
        ngw_webtest_app.post_json('/api/resource/', dict(resource=dict(
            cls='resource_group', parent=dict(id=ngw_resource_group),
            display_name=display_name)
        ), status=expected_status)

    with ngw_env.resource.options.override({'disable.resource_group': True}):
        create_resource_group('disable.resource_group', 422)

    with ngw_env.resource.options.override({'disabled_cls': ['resource_group', ]}):
        create_resource_group('diabled_cls', 422)
