from unittest.mock import MagicMock, patch

import pytest
import transaction

from ..model import Connection


@pytest.mark.parametrize("insecure", [False, True])
def test_request_wms_verify(insecure, ngw_resource_defaults):
    with transaction.manager:
        conn = Connection(
            url="http://example.com/wms",
            version="1.1.1",
            insecure=insecure,
        ).persist()

    with patch("nextgisweb.wmsclient.model.requests.get") as mock_get:
        mock_get.return_value = MagicMock(status_code=200)
        conn.request_wms("GetCapabilities")

    _, kwargs = mock_get.call_args
    assert kwargs.get("verify") == (not insecure)
