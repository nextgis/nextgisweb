# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import json
from datetime import datetime
from six import text_type

import transaction
from pyramid.interfaces import ISession
from sqlalchemy.orm.exc import NoResultFound
from zope.interface import implementer

from ..models import DBSession

from .model import Session, SessionStore
from .util import gensecret, datetime_to_unix

__all__ = ['WebSession']

allowed_types = (
    type(None),
    bool,
    int,
    float,
    text_type,
    tuple,
)


def validate_value(v):
    t = type(v)
    if t not in allowed_types:
        raise ValueError('Type `%s` is not allowed!' % t)
    elif t == tuple:
        return all(validate_value(_v) for _v in v)
    return True


@implementer(ISession)
class WebSession(dict):
    def __init__(self, request):
        self._refreshed = False
        self._updated = list()
        self._cleared = False
        self._deleted = list()
        self._cookie_name = request.env.pyramid.options['session.cookie.name']
        self._cookie_max_age = request.env.pyramid.options['session.cookie.max_age']
        self._session_id = request.cookies.get(self._cookie_name)
        self._last_activity = None

        if self._session_id is not None:
            try:
                actual_date = datetime.utcnow() - self._cookie_max_age
                session = Session.filter(
                    Session.id == self._session_id,
                    Session.last_activity > actual_date).one()
                self.new = False
                self.created = datetime_to_unix(session.created)
                self._last_activity = session.last_activity
            except NoResultFound:
                self._session_id = None

        if self._session_id is None:
            self.new = True
            self.created = datetime_to_unix(datetime.utcnow())

        def check_save(request, response):
            with transaction.manager:
                utcnow = datetime.utcnow()

                if self._session_id is not None:
                    if self._cleared:
                        SessionStore.filter(
                            SessionStore.session_id == self._session_id,
                            ~SessionStore.key.in_(self._updated)
                        ).delete(synchronize_session=False)
                    elif len(self._deleted) > 0:
                        SessionStore.filter(
                            SessionStore.session_id == self._session_id,
                            SessionStore.key.in_(self._deleted)
                        ).delete(synchronize_session=False)

                    activity_delta = request.env.pyramid.options['session.activity_delta']
                    if utcnow - self._last_activity > activity_delta:
                        DBSession.query(Session).filter_by(
                            id=self._session_id, last_activity=self._last_activity
                        ).update(dict(last_activity=utcnow))

                if len(self._updated) > 0:
                    if self._session_id is None:
                        self._session_id = gensecret(32)
                        Session(
                            id=self._session_id,
                            created=utcnow,
                            last_activity=utcnow
                        ).persist()

                    with DBSession.no_autoflush:
                        for key in self._updated:
                            try:
                                kv = SessionStore.filter_by(
                                    session_id=self._session_id,
                                    key=key).one()
                            except NoResultFound:
                                kv = SessionStore(session_id=self._session_id, key=key).persist()
                            kv.value = self._get_for_db(key)

            if self._session_id:
                cookie_settings = WebSession.cookie_settings(request)
                cookie_settings['max_age'] = self._cookie_max_age.total_seconds()
                response.set_cookie(self._cookie_name, value=self._session_id, **cookie_settings)

        request.add_response_callback(check_save)

    @staticmethod
    def cookie_settings(request):
        return dict(
            path='/',
            domain=None,
            httponly=True,
            samesite='Lax',
            secure=request.scheme == 'https'
        )

    def _get_for_db(self, key):
        value = super(WebSession, self).__getitem__(key)
        return json.dumps(value)

    def _set_from_db(self, key, value):
        value = json.loads(value)

        def array_to_tuple(v):
            if type(v) == list:
                v = tuple(array_to_tuple(_v) for _v in v)
            return v

        value = array_to_tuple(value)
        super(WebSession, self).__setitem__(key, value)

    @property
    def _keys(self):
        return super(WebSession, self).keys()

    def _refresh_all(self):
        if self._refreshed:
            return
        for kv in SessionStore.filter(SessionStore.session_id == self._session_id,
                                      ~SessionStore.key.in_(self._keys)).all():
            self._set_from_db(kv.key, kv.value)
        self._refreshed = True

    def _refresh(self, key):
        if self._refreshed or key in self._keys:
            return
        if key not in self._deleted:
            try:
                kv = SessionStore.filter_by(session_id=self._session_id, key=key).one()
                self._set_from_db(key, kv.value)
            except NoResultFound:
                pass

    # ISession

    def flash(self, msg, queue='', allow_duplicate=True):
        raise NotImplementedError()

    def pop_flash(self, queue=''):
        raise NotImplementedError()

    def peek_flash(self, queue=''):
        raise NotImplementedError()

    # dict

    def __contains__(self, key, *args, **kwargs):
        self._refresh(key)
        return super(WebSession, self).__contains__(key, *args, **kwargs)

    def keys(self, *args, **kwargs):
        self._refresh_all()
        return super(WebSession, self).keys(*args, **kwargs)

    def values(self, *args, **kwargs):
        self._refresh_all()
        return super(WebSession, self).values(*args, **kwargs)

    def items(self, *args, **kwargs):
        self._refresh_all()
        return super(WebSession, self).items(*args, **kwargs)

    def __len__(self, *args, **kwargs):
        self._refresh_all()
        return super(WebSession, self).__len__(*args, **kwargs)

    def __getitem__(self, key, *args, **kwargs):
        self._refresh(key)
        return super(WebSession, self).__getitem__(key, *args, **kwargs)

    def get(self, key, *args, **kwargs):
        self._refresh(key)
        return super(WebSession, self).get(key, *args, **kwargs)

    def __iter__(self, *args, **kwargs):
        self._refresh_all()
        return super(WebSession, self).__iter__(*args, **kwargs)

    def __setitem__(self, key, value, *args, **kwargs):
        validate_value(value)
        if key not in self._updated:
            self._updated.append(key)
        if key in self._deleted:
            self._deleted.remove(key)
        return super(WebSession, self).__setitem__(key, value, *args, **kwargs)

    def setdefault(self, *args, **kwargs):
        raise NotImplementedError()

    def update(self, *args, **kwargs):
        raise NotImplementedError()

    def __delitem__(self, key, *args, **kwargs):
        self._refresh(key)
        if key not in self._deleted:
            self._deleted.append(key)
        if key in self._updated:
            self._updated.remove(key)
        return super(WebSession, self).__delitem__(key, *args, **kwargs)

    def pop(self, *args, **kwargs):
        raise NotImplementedError()

    def popitem(self, *args, **kwargs):
        raise NotImplementedError()

    def clear(self, *args, **kwargs):
        del self._updated[:]
        del self._deleted[:]
        self._cleared = True
        self._refreshed = True
        return super(WebSession, self).clear(*args, **kwargs)
