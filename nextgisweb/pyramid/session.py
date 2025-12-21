import transaction
from pyramid.interfaces import ISession
from sqlalchemy.exc import NoResultFound
from zope.interface import implementer

from nextgisweb.env import DBSession
from nextgisweb.lib.datetime import utcnow_naive

from .model import Session, SessionStore
from .util import datetime_to_unix, gensecret


@implementer(ISession)
class WebSession(dict):
    def __init__(self, request):
        self._refreshed = False
        self._updated = list()
        self._cleared = False
        self._deleted = list()
        self._cookie_name = request.env.pyramid.options["session.cookie.name"]
        self._cookie_max_age = request.env.pyramid.options["session.cookie.max_age"]
        self._session_id = request.cookies.get(self._cookie_name)
        self._last_activity = None

        if self._session_id is not None:
            try:
                actual_date = utcnow_naive() - self._cookie_max_age
                session = Session.filter(
                    Session.id == self._session_id, Session.last_activity > actual_date
                ).one()
                self.new = False
                self.created = datetime_to_unix(session.created)
                self._last_activity = session.last_activity
            except NoResultFound:
                self._session_id = None

        if self._session_id is None:
            self.new = True
            self.created = datetime_to_unix(utcnow_naive())

        def check_save(request, response):
            update_cookie = False

            with transaction.manager:
                utcnow = utcnow_naive()

                if self._session_id is not None:
                    if self._cleared:
                        SessionStore.filter(
                            SessionStore.session_id == self._session_id,
                            ~SessionStore.key.in_(self._updated),
                        ).delete(synchronize_session=False)
                    elif len(self._deleted) > 0:
                        SessionStore.filter(
                            SessionStore.session_id == self._session_id,
                            SessionStore.key.in_(self._deleted),
                        ).delete(synchronize_session=False)

                    activity_delta = request.env.pyramid.options["session.activity_delta"]
                    if utcnow - self._last_activity > activity_delta:
                        DBSession.query(Session).filter_by(
                            id=self._session_id, last_activity=self._last_activity
                        ).update(dict(last_activity=utcnow))
                        update_cookie = True

                if len(self._updated) > 0:
                    if self._session_id is None:
                        self._session_id = gensecret(32)
                        Session(
                            id=self._session_id, created=utcnow, last_activity=utcnow
                        ).persist()
                        update_cookie = True

                    with DBSession.no_autoflush:
                        for key in self._updated:
                            try:
                                kv = SessionStore.filter_by(
                                    session_id=self._session_id, key=key
                                ).one()
                            except NoResultFound:
                                kv = SessionStore(session_id=self._session_id, key=key).persist()
                            kv.value = self[key]

            if update_cookie:
                # Check if another session is set
                for h, v in response.headerlist:
                    if h == "Set-Cookie" and v.startswith(self._cookie_name + "="):
                        return
                cookie_settings = WebSession.cookie_settings(request)
                cookie_settings["max_age"] = int(self._cookie_max_age.total_seconds())
                response.set_cookie(self._cookie_name, value=self._session_id, **cookie_settings)

        request.add_response_callback(check_save)

    @staticmethod
    def cookie_settings(request):
        is_https = request.scheme == "https"
        return dict(
            path="/",
            domain=None,
            httponly=True,
            samesite="None" if is_https else "Lax",
            secure=is_https,
        )

    @property
    def id(self):
        return self._session_id

    @property
    def _keys(self):
        return super().keys()

    def _refresh_all(self):
        if self._session_id is None or self._refreshed:
            return
        for kv in SessionStore.filter(
            SessionStore.session_id == self._session_id, ~SessionStore.key.in_(self._keys)
        ).all():
            self[kv.key] = kv.value
        self._refreshed = True

    def _refresh(self, key):
        if self._session_id is None or self._refreshed or key in self._keys:
            return
        if key not in self._deleted:
            try:
                kv = SessionStore.filter_by(session_id=self._session_id, key=key).one()
                self[key] = kv.value
            except NoResultFound:
                pass

    # ISession

    def flash(self, msg, queue="", allow_duplicate=True):
        raise NotImplementedError()

    def pop_flash(self, queue=""):
        raise NotImplementedError()

    def peek_flash(self, queue=""):
        raise NotImplementedError()

    # dict

    def __contains__(self, key, *args, **kwargs):
        self._refresh(key)
        return super().__contains__(key, *args, **kwargs)

    def keys(self, *args, **kwargs):
        self._refresh_all()
        return super().keys(*args, **kwargs)

    def values(self, *args, **kwargs):
        self._refresh_all()
        return super().values(*args, **kwargs)

    def items(self, *args, **kwargs):
        self._refresh_all()
        return super().items(*args, **kwargs)

    def __len__(self, *args, **kwargs):
        self._refresh_all()
        return super().__len__(*args, **kwargs)

    def __getitem__(self, key, *args, **kwargs):
        self._refresh(key)
        return super().__getitem__(key, *args, **kwargs)

    def get(self, key, *args, **kwargs):
        self._refresh(key)
        return super().get(key, *args, **kwargs)

    def __iter__(self, *args, **kwargs):
        self._refresh_all()
        return super().__iter__(*args, **kwargs)

    def __setitem__(self, key, value, *args, **kwargs):
        if key not in self._updated:
            self._updated.append(key)
        if key in self._deleted:
            self._deleted.remove(key)
        return super().__setitem__(key, value, *args, **kwargs)

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
        return super().__delitem__(key, *args, **kwargs)

    def pop(self, *args, **kwargs):
        raise NotImplementedError()

    def popitem(self, *args, **kwargs):
        raise NotImplementedError()

    def clear(self, *args, **kwargs):
        del self._updated[:]
        del self._deleted[:]
        self._cleared = True
        self._refreshed = True
        return super().clear(*args, **kwargs)
