# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from base64 import b64decode
from datetime import datetime, timedelta
from logging import getLogger

import six
import sqlalchemy as sa
from pyramid.httpexceptions import HTTPUnauthorized
from pyramid.interfaces import IAuthenticationPolicy
from sqlalchemy.orm.exc import NoResultFound
from zope.interface import implementer

from ..compat import datetime_to_timestamp, timestamp_to_datetime
from ..core.exception import ValidationError
from ..lib.config import Option, OptionAnnotations
from .exception import InvalidCredentialsException, UserDisabledException
from .models import User
from .oauth import OAuthTokenRefreshException

logger = getLogger(__name__)


@implementer(IAuthenticationPolicy)
class AuthenticationPolicy(object):
    def __init__(self, comp, options):
        self.comp = comp
        self.oauth = comp.oauth
        self.options = options
        self.test_user = None

    def unauthenticated_userid(self, request):
        return None

    def authenticated_userid(self, request):
        # Override current user in tests via ngw_auth_administrator fixture
        if self.test_user is not None:
            return User.by_keyname(self.test_user).id

        session = request.session

        # Session based authentication

        current = session.get("auth.policy.current")
        if current is not None:
            atype, user_id, exp = current[0:3]
            exp = timestamp_to_datetime(int(exp))

            now = datetime.utcnow()
            expired = exp <= now

            if atype == "OAUTH":
                if len(current) != 3:
                    raise ValueError("Invalid OAuth session data")

                if expired:
                    try:
                        tresp = self.oauth.grant_type_refresh_token(
                            refresh_token=session["auth.policy.refresh_token"],
                            access_token=session["auth.policy.access_token"],
                        )
                        self.remember(request, (user_id, tresp))
                    except OAuthTokenRefreshException:
                        self.forget(request)
                        return None

                return user_id

            elif atype == "LOCAL":
                if expired:
                    return None

                (refresh,) = current[3:]
                if timestamp_to_datetime(refresh) <= now:
                    session["auth.policy.current"] = current[0:2] + (
                        int(
                            datetime_to_timestamp(now + self.options["local.lifetime"])
                        ),
                        int(datetime_to_timestamp(now + self.options["local.refresh"])),
                    )

                return user_id

            else:
                raise ValueError("Invalid authentication type: " + atype)

        # HTTP based authentication

        ahead = request.headers.get("Authorization")
        if ahead is not None:
            ahead = six.ensure_text(ahead)
            items = ahead.split(" ")
            if len(items) != 2:
                raise ValidationError("Invalid 'Authorization' header.")
            amode, value = items
            amode = amode.upper()

            if amode == "BASIC":
                items = six.ensure_text(b64decode(value)).split(":")
                if len(items) != 2:
                    raise ValidationError("Invalid 'Authorization' header.")
                username, password = items

                # Allow token authorization via basic when
                # username is empty (for legacy clients).

                if username == "":
                    amode = "BEARER"
                    value = password

                else:
                    user, _ = self.authenticate_with_password(
                        username, password, oauth=False
                    )
                    return user.id

            if amode == "BEARER" and self.oauth is not None:
                user = self.oauth.access_token_to_user(value)
                if user is not None:
                    return user.id

            raise HTTPUnauthorized()

        return None

    def effective_principals(self, request):
        return []

    def remember(self, request, what):
        session = request.session
        user_id, tresp = what
        if user_id is None:
            raise ValueError("Empty user_id in a session")

        atype = "LOCAL" if tresp is None else "OAUTH"
        exp = (
            int(
                datetime_to_timestamp(
                    datetime.utcnow() + self.options["local.lifetime"]
                )
            )
            if tresp is None
            else tresp.expires
        )

        session["auth.policy.current"] = (atype, user_id, int(exp)) + (
            (
                int(
                    datetime_to_timestamp(
                        datetime.utcnow() + self.options["local.refresh"]
                    )
                ),
            )
            if atype == "LOCAL"
            else ()
        )

        for k in ("access_token", "refresh_token"):
            sk = "auth.policy.{}".format(k)
            if tresp is None:
                if sk in session:
                    del session[sk]
            else:
                session[sk] = getattr(tresp, k)

        return ()

    def forget(self, request):
        session = request.session

        for k in ("current", "access_token", "refresh_token"):
            sk = "auth.policy.{}".format(k)
            if sk in session:
                del session[sk]

        return ()

    def authenticate_with_password(self, username, password, oauth=True):
        user = None
        tresp = None

        # Step 1: Authentication with local credentials

        q = User.filter(sa.func.lower(User.keyname) == username.lower())
        if self.oauth and not self.oauth.local_auth:
            q = q.filter_by(oauth_subject=None)

        try:
            test_user = q.one()
            if test_user.disabled:
                raise UserDisabledException()
            elif test_user.password == password:
                user = test_user
        except NoResultFound:
            pass

        # Step 2: Authentication with OAuth password if enabled

        if user is None and oauth and self.oauth is not None and self.oauth.password:
            tresp = self.oauth.grant_type_password(username, password)
            user = self.oauth.access_token_to_user(tresp.access_token)

        if user is None:
            raise InvalidCredentialsException()

        return (user, tresp)

    option_annotations = OptionAnnotations(
        (
            Option(
                "local.lifetime",
                timedelta,
                default=timedelta(days=1),
                doc="Local authentication lifetime.",
            ),
            Option(
                "local.refresh",
                timedelta,
                default=timedelta(hours=1),
                doc="Refresh local authentication lifetime interval.",
            ),
        )
    )
