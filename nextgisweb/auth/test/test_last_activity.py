from datetime import datetime, timedelta

import transaction
from freezegun import freeze_time

from ...models import DBSession
from ..model import User


def test_last_activity(ngw_env, ngw_webtest_app):
    with transaction.manager:
        for keyname, last_activity in (
            ('guest', datetime.utcnow()),
            ('administrator', None),
        ):
            DBSession.query(User).filter_by(keyname=keyname).update(
                dict(last_activity=last_activity))

    with ngw_env.auth.options.override(activity_delta=timedelta(seconds=0)):
        with freeze_time() as frozen_datetime:
            ngw_webtest_app.get('/resource/0', status='*')
            assert User.by_keyname('guest').last_activity == frozen_datetime.time_to_freeze
            last_activity = User.by_keyname('guest').last_activity

    with ngw_env.auth.options.override(activity_delta=timedelta(seconds=100)):
        ngw_webtest_app.get('/resource/0', status='*')
        assert User.by_keyname('guest').last_activity == last_activity

    with ngw_env.auth.options.override(activity_delta=timedelta(seconds=0)):
        with freeze_time() as frozen_datetime:
            ngw_webtest_app.authorization = ('Basic', ('administrator', 'admin'))
            ngw_webtest_app.get('/resource/0', status='*')
            assert User.by_keyname('administrator').last_activity == frozen_datetime.time_to_freeze
