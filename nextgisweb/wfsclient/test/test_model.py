from textwrap import dedent
from unittest.mock import MagicMock, patch

import pytest
import requests
import transaction

from nextgisweb.core.exception import ExternalServiceError

from ..model import VersionNotSupported, WFSConnection

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


def _connection():
    with transaction.manager:
        return WFSConnection(path="http://example.com/wfs", version="2.0.2").persist()


def _response(status_code, content, content_type="application/xml"):
    return MagicMock(
        status_code=status_code,
        content=content,
        headers={"Content-Type": content_type},
    )


def test_request_wfs_request_exception(ngw_resource_defaults):
    conn = _connection()
    with patch("nextgisweb.wfsclient.model.requests.request") as mock_request:
        mock_request.side_effect = requests.exceptions.ConnectionError("simulated")
        with pytest.raises(ExternalServiceError) as exc_info:
            conn.request_wfs("GET")

    assert "Unable to get a response" in str(exc_info.value.message)
    assert "ConnectionError" in exc_info.value.detail


def test_request_wfs_exception_report(ngw_resource_defaults):
    conn = _connection()
    content = dedent(
        """\
        <?xml version="1.0" encoding="UTF-8"?>
        <ExceptionReport xmlns="http://www.opengis.net/ows/1.1" version="2.0.0">
            <Exception exceptionCode="OperationParsingFailed" locator="GetFeature">
                <ExceptionText>Illegal property name: foo</ExceptionText>
            </Exception>
        </ExceptionReport>
        """
    ).encode()
    with patch("nextgisweb.wfsclient.model.requests.request") as mock_request:
        mock_request.return_value = _response(400, content)
        with pytest.raises(ExternalServiceError) as exc_info:
            conn.request_wfs("GET")

    assert "Illegal property name: foo (OperationParsingFailed)" == str(exc_info.value.message)
    assert exc_info.value.data["status_code"] == 400


def test_request_wfs_invalid_xml(ngw_resource_defaults):
    conn = _connection()
    with patch("nextgisweb.wfsclient.model.requests.request") as mock_request:
        mock_request.return_value = _response(200, b"It was a dark and stormy night")
        with pytest.raises(ExternalServiceError) as exc_info:
            conn.request_wfs("GET")

    assert "Failed to parse the XML response" in str(exc_info.value.message)
    assert exc_info.value.data["content_type"] == "application/xml"


def test_request_wfs_version_negotiation_failed(ngw_resource_defaults):
    conn = _connection()
    content = dedent(
        """\
        <?xml version="1.0" encoding="UTF-8"?>
        <ExceptionReport xmlns="http://www.opengis.net/ows/1.1" version="2.0.0">
            <Exception exceptionCode="VersionNegotiationFailed" />
        </ExceptionReport>
        """
    ).encode()
    with patch("nextgisweb.wfsclient.model.requests.request") as mock_request:
        mock_request.return_value = _response(400, content)
        with pytest.raises(VersionNotSupported):
            conn.request_wfs("GET")


def test_request_wfs_legacy_exception_report(ngw_resource_defaults):
    # WFS 1.0.0 style ServiceExceptionReport (legacy connections)
    conn = _connection()
    content = dedent(
        """\
        <?xml version="1.0" encoding="UTF-8"?>
        <ServiceExceptionReport version="1.0.0">
            <ServiceException code="InvalidParameterValue">
                Illegal property name: foo
            </ServiceException>
        </ServiceExceptionReport>
        """
    ).encode()
    with patch("nextgisweb.wfsclient.model.requests.request") as mock_request:
        mock_request.return_value = _response(400, content)
        with pytest.raises(ExternalServiceError) as exc_info:
            conn.request_wfs("GET")

    assert "Illegal property name: foo (InvalidParameterValue)" == str(exc_info.value.message)
    assert exc_info.value.data["status_code"] == 400


def test_request_wfs_whitespace_exception_code(ngw_resource_defaults):
    conn = _connection()
    content = dedent(
        """\
        <?xml version="1.0" encoding="UTF-8"?>
        <ExceptionReport xmlns="http://www.opengis.net/ows/1.1" version="2.0.0">
            <Exception exceptionCode="  OperationParsingFailed  ">
                <ExceptionText>Illegal property name: foo</ExceptionText>
            </Exception>
        </ExceptionReport>
        """
    ).encode()
    with patch("nextgisweb.wfsclient.model.requests.request") as mock_request:
        mock_request.return_value = _response(400, content)
        with pytest.raises(ExternalServiceError) as exc_info:
            conn.request_wfs("GET")

    assert "Illegal property name: foo (OperationParsingFailed)" == str(exc_info.value.message)
    assert exc_info.value.data["status_code"] == 400


def test_request_wfs_empty_exception_attributes(ngw_resource_defaults):
    conn = _connection()
    content = dedent(
        """\
        <?xml version="1.0" encoding="UTF-8"?>
        <ExceptionReport xmlns="http://www.opengis.net/ows/1.1" version="2.0.0">
            <Exception exceptionCode="" />
        </ExceptionReport>
        """
    ).encode()
    with patch("nextgisweb.wfsclient.model.requests.request") as mock_request:
        mock_request.return_value = _response(400, content)
        with pytest.raises(ExternalServiceError) as exc_info:
            conn.request_wfs("GET")

    assert "(400)" in str(exc_info.value.message)
    assert exc_info.value.data["status_code"] == 400


def test_request_wfs_unexpected_status_code(ngw_resource_defaults):
    conn = _connection()
    with patch("nextgisweb.wfsclient.model.requests.request") as mock_request:
        mock_request.return_value = _response(503, b"Service Unavailable")
        with pytest.raises(ExternalServiceError) as exc_info:
            conn.request_wfs("GET")

    assert "(503)" in str(exc_info.value.message)
