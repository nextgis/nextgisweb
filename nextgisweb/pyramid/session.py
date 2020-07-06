# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from datetime import datetime, timedelta
from uuid import uuid4

import six
import transaction
from pyramid.interfaces import ISession
from sqlalchemy.orm.exc import NoResultFound
from zope.interface import implementer

from .model import Session, SessionStore
from .util import datetime_to_unix


cookie_name = 'session'
cookie_settings = dict(
    path='/',
    domain=None,
    httponly=True,
    samesite='Lax'
)


@implementer(ISession)
class WebSession(dict):
    def __init__(self, request):
        self._max_age = request.env.pyramid.options['session.max_age']
        self._session_id = request.cookies.get(cookie_name)
        if self._session_id is not None:
            try:
                # Init session from DB
                actual_date = datetime.utcnow() - timedelta(seconds=self._max_age)
                session = Session.filter(
                    Session.id == self._session_id,
                    Session.last_activity > actual_date).one()
                for session_kv in session.store:
                    self[session_kv.key] = session_kv.value
                self.new = False
                self.created = datetime_to_unix(session.created)
            except NoResultFound:
                self._session_id = None

        if self._session_id is None:
            self.new = True
            self.created = datetime_to_unix(datetime.utcnow())

        def check_save(request, response):
            if len(self) == 0:
                return

            with transaction.manager:
                if self._session_id is not None:
                    try:
                        session = Session.filter_by(id=self._session_id).one()
                    except NoResultFound:
                        self._session_id = None

                if self._session_id is None:
                    session = Session(
                        id=six.text_type(uuid4().hex),
                        created=datetime.utcnow()
                    )

                session.last_activity = datetime.utcnow()

                keys = list(self.keys())
                old_store = list(session.store)

                for session_kv in old_store:
                    if session_kv.key not in keys:  # Removed key
                        session.remove(session)
                    else:  # Updated key
                        session_kv.value = self[session_kv.key]  # Check redunant updates
                        keys.remove(session_kv.key)

                for key in keys:
                    session_kv = SessionStore(key=key, value=self[key])  # New key
                    session.store.append(session_kv)

                session.persist()

            cookie_settings['secure'] = request.scheme == 'https'
            cookie_settings['max_age'] = self._max_age
            response.set_cookie(cookie_name, value=session.id, **cookie_settings)

        request.add_response_callback(check_save)

    def flash(msg, queue='', allow_duplicate=True):
        raise NotImplementedError()

    def pop_flash(queue=''):
        raise NotImplementedError()

    def peek_flash(queue=''):
        raise NotImplementedError()


def session_factory():

    return WebSession
