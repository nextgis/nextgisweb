from datetime import datetime, timedelta

import transaction

from nextgisweb.models import DBSession
from nextgisweb.auth import User


def test_last_activity(ngw_env, ngw_webtest_app):
    epsilon = timedelta(milliseconds=500)

    with transaction.manager:
        for keyname, last_activity in (
            ('guest', datetime.utcnow() - 2 * epsilon),
            ('administrator', None),
        ):
            DBSession.query(User).filter_by(keyname=keyname).update(
                dict(last_activity=last_activity))

    def lt_epsilon(keyname):
        return timedelta() < (
            datetime.utcnow() - User.by_keyname(keyname).last_activity
        ) < epsilon

    with ngw_env.auth.options.override(activity_delta=timedelta(seconds=0)):
        ngw_webtest_app.get('/resource/0', status='*')
        assert lt_epsilon('guest'), "Unexpected last_activity value"
        last_activity = User.by_keyname('guest').last_activity

    with ngw_env.auth.options.override(activity_delta=timedelta(seconds=100)):
        ngw_webtest_app.get('/resource/0', status='*')
        assert User.by_keyname('guest').last_activity == last_activity

    with ngw_env.auth.options.override(activity_delta=timedelta(seconds=0)):
        ngw_webtest_app.authorization = ('Basic', ('administrator', 'admin'))
        ngw_webtest_app.get('/resource/0', status='*')
        assert lt_epsilon('administrator'), "Unexpected last_activity value"
