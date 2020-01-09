# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import six

import pytest
from zope.interface import implementer

from nextgisweb.core.util import _
from nextgisweb.core.exception import (
    IUserException,
    user_exception,
    UserException,
)


def test_interface():

    @implementer(IUserException)
    class TestException(Exception):
        title = "Title"
        message = "Message"
        detail = "Detail"
        http_status_code = 418
        data = dict(key="value")

    exc = TestException()
    uexc = IUserException(exc)

    assert uexc.title == "Title"
    assert uexc.message == "Message"
    assert uexc.detail == "Detail"
    assert uexc.http_status_code == 418
    assert uexc.data == dict(key="value")


def test_adaptaion():

    class TestException(Exception):
        pass

    uexc = IUserException(user_exception(
        TestException(),
        title="Title",
        message="Message",
        detail="Detail",
        http_status_code=418,
        data=dict(key="value")))

    assert uexc.title == "Title"
    assert uexc.message == "Message"
    assert uexc.detail == "Detail"
    assert uexc.http_status_code == 418
    assert uexc.data == dict(key="value")


def test_not_implemented():
    class TestException(Exception):
        pass

    with pytest.raises(TypeError):
        IUserException(TestException())


def test_user_exception():
    try:
        raise UserException(
            title="Title", message="Message",
            detail="Detail", data=dict(key="value"),
            http_status_code=418)
    except UserException as exc:
        assert six.text_type(exc) == "UserException: Message"
        assert exc.title == "Title"
        assert exc.message == "Message"
        assert exc.detail == "Detail"
        assert exc.http_status_code == 418


def test_localizer():
    exc = UserException(message=_('The answer is %d') % 42)
    assert six.text_type(exc) == "UserException: The answer is 42"


def test_positional_message():
    with pytest.warns(UserWarning, match='^UserException accepted message as positional .*'):
        exc = UserException("Message")
    assert exc.message == "Message"
    assert exc.title is None
