from ..adapter import PointCloudAdapter, WebMapAdapter
from ..model import WebMapItem, WebMapItemLayerWrite


def test_point_cloud_adapter_registered():
    assert WebMapAdapter.registry["point_cloud"] is PointCloudAdapter
    assert "point_cloud" in WebMapItem.__table__.c.layer_adapter.type.enums


def test_point_cloud_adapter_allowed_in_webmap_layer_write():
    item = WebMapItemLayerWrite(
        display_name="Point cloud",
        layer_style_id=1,
        layer_adapter="point_cloud",
    )

    assert item.layer_adapter == "point_cloud"
