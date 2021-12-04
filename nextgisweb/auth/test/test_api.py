from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs

import pytest
import transaction
from freezegun import freeze_time

from nextgisweb import db
from nextgisweb.auth import User, Group
from nextgisweb.models import DBSession


@pytest.fixture()
def user():
    with transaction.manager:
        user = User(
            keyname='test-user',
            display_name='test-user',
            password='password123'
        ).persist()
        DBSession.flush()

    yield user

    with transaction.manager:
        DBSession.delete(User.filter_by(id=user.id).one())


def _test_current_user(ngw_webtest_app, keyname):
    res = ngw_webtest_app.get('/api/component/auth/current_user')
    assert res.json['keyname'] == keyname


def test_session_invite(user, ngw_env, ngw_webtest_app):
    sid_key = ngw_env.pyramid.options['session.cookie.name']

    url = ngw_env.auth.session_invite(user.keyname, 'https://no-matter/some/path')
    result = urlparse(url)

    query = parse_qs(result.query)
    sid = query['sid'][0]
    expires = query['expires'][0]
    expires_dt = datetime.fromisoformat(expires)
    next_url = query['next'][0]
    assert next_url == '/some/path'

    ngw_webtest_app.post('/login', dict(
        login='test-user', password='password123', status=302))
    sid_key in ngw_webtest_app.cookies
    assert ngw_webtest_app.cookies[sid_key] != sid
    _test_current_user(ngw_webtest_app, 'test-user')

    ngw_webtest_app.post('/login', dict(
        sid=sid + 'invalid', expires=expires), status=401)

    ngw_webtest_app.post('/login', dict(
        sid=sid, expires=expires_dt + timedelta(seconds=1)
    ), status=401)

    with freeze_time(expires_dt + timedelta(seconds=1)):
        ngw_webtest_app.post('/login', dict(
            sid=sid, expires=expires), status=401)

    with freeze_time(expires_dt - timedelta(minutes=5)):
        ngw_webtest_app.post('/login', dict(
            sid=sid, expires=expires), status=302)

    assert sid_key in ngw_webtest_app.cookies
    assert ngw_webtest_app.cookies[sid_key] == sid
    _test_current_user(ngw_webtest_app, 'test-user')

    ngw_webtest_app.post('/logout', status=302)
    sid_key not in ngw_webtest_app.cookies
    _test_current_user(ngw_webtest_app, 'guest')

    ngw_webtest_app.post('/login', dict(
        sid=sid, expires=expires), status=401)


@pytest.fixture()
def disable_users():
    active_uids = []

    with transaction.manager:
        for user in User.filter(db.and_(
            User.keyname != 'administrator',
            db.not_(User.disabled),
            db.not_(User.system)
        )).all():
            user.disabled = True
            active_uids.append(user.id)
        DBSession.flush()

    yield

    with transaction.manager:
        for user in User.filter(User.id.in_(active_uids)).all():
            user.disabled = False
        DBSession.flush()


def test_user_limit(ngw_env, ngw_webtest_app, ngw_auth_administrator, disable_users):
    API_URL = '/api/component/auth/user/'

    admins = Group.filter_by(keyname='administrators').one()

    vasya = dict(keyname='test-vasya', display_name='Test Vasya',
                 password='12345', disabled=False, member_of=[admins.id])

    with ngw_env.auth.options.override(dict(user_limit=2)):
        res = ngw_webtest_app.post_json(API_URL, vasya, status=200)
        vasya_id = res.json['id']

        petya = dict(keyname='test-petya', display_name='Test Petya',
                     password='67890', disabled=False)
        ngw_webtest_app.post_json(API_URL, petya, status=422)

        vasya['disabled'] = True
        ngw_webtest_app.put_json(API_URL + str(vasya_id), vasya, status=200)

        res = ngw_webtest_app.post_json(API_URL, petya, status=200)
        petya_id = res.json['id']

        masha = dict(keyname='test-masha', display_name='Test Masha',
                     password='password', disabled=False)
        ngw_webtest_app.post_json(API_URL, masha, status=422)

        ngw_webtest_app.delete(API_URL + str(vasya_id), status=200)
        ngw_webtest_app.delete(API_URL + str(petya_id), status=200)


def test_user_over_limit(ngw_env, ngw_webtest_app, ngw_auth_administrator, disable_users):
    API_URL = '/api/component/auth/user/'

    user1 = dict(keyname='test-user1', display_name='Test user1',
                 password='12345', disabled=False)
    res = ngw_webtest_app.post_json(API_URL, user1)
    user1_id = res.json['id']
    user2 = dict(keyname='test-user2', display_name='Test user2',
                 password='12345', disabled=False)
    res = ngw_webtest_app.post_json(API_URL, user2)
    user2_id = res.json['id']

    with ngw_env.auth.options.override(dict(user_limit=2)):
        ngw_webtest_app.put_json(API_URL + str(user1_id), dict(
            display_name='Test user1 name'), status=200)

        ngw_webtest_app.put_json(API_URL + str(user1_id), dict(
            disabled=True), status=200)

        ngw_webtest_app.put_json(API_URL + str(user1_id), dict(
            disabled=False), status=422)

    with ngw_env.auth.options.override(dict(user_limit=3)):
        ngw_webtest_app.put_json(API_URL + str(user1_id), dict(
            disabled=False), status=200)

    ngw_webtest_app.delete(API_URL + str(user1_id), status=200)
    ngw_webtest_app.delete(API_URL + str(user2_id), status=200)
