# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
import zope.interface

from nextgisweb.core.exception import IUserException, user_exception


def test_interface():

    class TestException(Exception):
        zope.interface.implements(IUserException)

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
