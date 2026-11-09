from textwrap import dedent
from unittest.mock import MagicMock, patch

import pytest
import requests
import transaction

from nextgisweb.core.exception import ExternalServiceError
from nextgisweb.resource.test import ResourceAPI

from ..model import WMSConnection, _extract_wms_error

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults")


@pytest.mark.parametrize("insecure", [False, True])
def test_request_wms_verify(insecure):
    with transaction.manager:
        conn = WMSConnection(
            url="http://example.com/wms",
            version="1.1.1",
            insecure=insecure,
        ).persist()

    with patch("nextgisweb.wmsclient.model.requests.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200)
        conn.request_wms("GetCapabilities")

    _, kwargs = mock_get.call_args
    assert kwargs.get("verify") == (not insecure)


@pytest.mark.parametrize("referer", [None, "http://example.com"])
def test_request_wms_referer(referer):
    with transaction.manager:
        conn = WMSConnection(
            url="http://example.com/wms",
            version="1.1.1",
            referer=referer,
        ).persist()

    with patch("nextgisweb.wmsclient.model.requests.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200)
        conn.request_wms("GetCapabilities")

    _, kwargs = mock_get.call_args
    actual = kwargs.get("headers", {}).get("Referer")
    assert actual is None if referer is None else actual == referer


def test_request_wms_request_exception():
    with transaction.manager:
        conn = WMSConnection(url="http://example.com/wms", version="1.1.1").persist()

    with patch("nextgisweb.wmsclient.model.requests.get") as mock_get:
        mock_get.side_effect = requests.exceptions.ConnectionError("simulated")
        with pytest.raises(ExternalServiceError) as exc_info:
            conn.request_wms("GetCapabilities")

    assert "Unable to get a response" in str(exc_info.value.message)
    assert "ConnectionError" in str(exc_info.value.detail)


def test_capcache_query_invalid_xml(ngw_txn):
    conn = WMSConnection(url="http://example.com/wms", version="1.1.1").persist()

    response = MagicMock(
        status_code=200,
        content=b"<html><body>Not an XML document",
        headers={"Content-Type": "text/html"},
    )
    with patch("nextgisweb.wmsclient.model.requests.get") as mock_get:
        mock_get.return_value = response
        with pytest.raises(ExternalServiceError) as exc_info:
            conn.capcache_query()

    assert "Failed to parse the XML response" in str(exc_info.value.message)
    assert exc_info.value.data["status_code"] == 200
    assert exc_info.value.data["content_type"] == "text/html"


def test_extract_wms_error():
    doc = dedent(
        """\
        <?xml version="1.0" encoding="UTF-8"?>
        <ServiceExceptionReport version="1.3.0"
            xmlns="http://www.opengis.net/ogc"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="http://www.opengis.net/ogc
                http://schemas.opengis.net/wms/1.3.0/exceptions_1_3_0.xsd">
            <ServiceException>
                Plain text message about an error.
            </ServiceException>
            <ServiceException code="InvalidUpdateSequence">
                Another error message, this one with a service exception code supplied.
            </ServiceException>
            <ServiceException>
                <![CDATA[
                Error in module <foo.c>, line 42
                ]]>
            </ServiceException>
            <ServiceException>
                <![CDATA[
                <Module>foo.c</Module>
                ]]>
            </ServiceException>
        </ServiceExceptionReport>
        """
    ).encode()

    assert _extract_wms_error(doc) == (None, "Plain text message about an error.")
    assert _extract_wms_error(b"It was a dark and stormy night") == (None, None)


def test_extract_wms_error_whitespace_code():
    doc = dedent(
        """\
        <?xml version="1.0" encoding="UTF-8"?>
        <ServiceExceptionReport version="1.3.0" xmlns="http://www.opengis.net/ogc">
            <ServiceException code="  InvalidUpdateSequence  ">
                Another error message.
            </ServiceException>
        </ServiceExceptionReport>
        """
    ).encode()
    assert _extract_wms_error(doc) == ("InvalidUpdateSequence", "Another error message.")


def test_extract_wms_error_empty_attributes():
    doc = dedent(
        """\
        <?xml version="1.0" encoding="UTF-8"?>
        <ServiceExceptionReport version="1.3.0" xmlns="http://www.opengis.net/ogc">
            <ServiceException code=""></ServiceException>
        </ServiceExceptionReport>
        """
    ).encode()
    assert _extract_wms_error(doc) == (None, None)

    doc = dedent(
        """\
        <?xml version="1.0" encoding="UTF-8"?>
        <ServiceExceptionReport version="1.3.0" xmlns="http://www.opengis.net/ogc">
            <ServiceException>   </ServiceException>
        </ServiceExceptionReport>
        """
    ).encode()
    assert _extract_wms_error(doc) == (None, None)


@pytest.mark.parametrize(
    "version_from, version_to, ok",
    (
        ("1.1.1", "1.3.0", True),
        ("1.1.1", "unknown", False),
        ("wmts-1.0.0", "1.1.1", False),
        ("1.3.0", "wmts-1.0.0", False),
    ),
)
def test_version_change(version_from, version_to, ok, ngw_auth_administrator):
    with transaction.manager:
        conn = WMSConnection(url="http://example.com/wms", version=version_from).persist()

    rapi = ResourceAPI()
    data = {"wmsclient_connection": {"version": version_to}}
    rapi.update_request(conn.id, data, status=200 if ok else 422)
