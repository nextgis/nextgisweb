import pytest
import transaction

from .. import WebMap, WebMapItem

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module", autouse=True)
def enable_annotation(ngw_env):
    with ngw_env.webmap.options.override(annotation=True):
        yield None


@pytest.fixture(scope="module")
def webmap(ngw_env):
    with transaction.manager:
        obj = WebMap(
            root_item=WebMapItem(item_type="root"),
        ).persist()
    yield obj.id


@pytest.fixture(scope="function")
def annotations_data():
    return [
        {
            "description": "Point annotation",
            "geom": "POINT (10 20)",
            "public": True,
            "style": {"circle": {"fill": {"color": "#FF9800"}, "radius": 5}},
        },
        {
            "description": "Polygon annotation",
            "geom": "POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0))",
            "public": False,
            "style": {
                "polygon": {
                    "fill": {"color": "#4CAF50"},
                    "stroke": {"color": "#388E3C", "width": 2},
                }
            },
        },
        {
            "description": "LineString annotation",
            "geom": "LINESTRING (0 0, 10 10, 20 0)",
            "public": True,
            "style": {"linestring": {"stroke": {"color": "#2196F3", "width": 3}}},
        },
    ]


@pytest.fixture(scope="function")
def invalid_annotations_geom():
    return [
        "",
        "POINT (10 20",
        "POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0",
    ]


@pytest.fixture(scope="function")
def created_annotations(webmap, ngw_webtest_app, annotations_data):
    collection_url = f"/api/resource/{webmap}/annotation/"
    created = []
    for annotation_payload in annotations_data:
        response = ngw_webtest_app.post_json(collection_url, annotation_payload)
        assert response.status_code == 200
        assert "id" in response.json
        created.append({"id": response.json["id"], "data": annotation_payload})

    yield created

    for ann in created:
        item_url = f"{collection_url}{ann['id']}"
        ngw_webtest_app.delete(item_url, status=[200, 404])


def test_post_annotation(webmap, ngw_webtest_app, annotations_data):
    collection_url = f"/api/resource/{webmap}/annotation/"
    annotation_payload = annotations_data[0]

    response = ngw_webtest_app.post_json(collection_url, annotation_payload)
    assert response.status_code == 200
    assert "id" in response.json
    annotation_id = response.json["id"]

    item_url = f"{collection_url}{annotation_id}"
    ngw_webtest_app.delete(item_url, status=200)


def test_get_annotations_collection(webmap, ngw_webtest_app, created_annotations):
    collection_url = f"/api/resource/{webmap}/annotation/"
    response = ngw_webtest_app.get(collection_url)
    assert response.status_code == 200
    assert len(response.json) >= len(created_annotations)


def test_get_single_annotation(webmap, ngw_webtest_app, created_annotations):
    collection_url = f"/api/resource/{webmap}/annotation/"
    for annotation_info in created_annotations:
        annotation_id = annotation_info["id"]
        original_data = annotation_info["data"]
        item_url = f"{collection_url}{annotation_id}"

        response = ngw_webtest_app.get(item_url)
        assert response.status_code == 200
        retrieved_data = response.json

        assert retrieved_data["description"] == original_data["description"]
        assert retrieved_data["geom"] == original_data["geom"]
        assert retrieved_data["public"] == original_data["public"]
        assert retrieved_data["style"] == original_data["style"]


def test_put_annotation(webmap, ngw_webtest_app, created_annotations):
    collection_url = f"/api/resource/{webmap}/annotation/"
    annotation_to_update = created_annotations[0]
    annotation_id = annotation_to_update["id"]
    original_data = annotation_to_update["data"]
    item_url = f"{collection_url}{annotation_id}"

    update_payload = {
        "description": "Updated Point annotation via PUT",
        "geom": original_data["geom"],
        "style": original_data["style"],
    }

    response = ngw_webtest_app.put_json(item_url, update_payload)
    assert response.status_code == 200

    get_response = ngw_webtest_app.get(item_url)
    assert get_response.status_code == 200
    updated_data = get_response.json

    assert updated_data["description"] == update_payload["description"]
    assert updated_data["geom"] == original_data["geom"]
    assert updated_data["public"] == original_data["public"]


def test_patch_annotation(webmap, ngw_webtest_app, created_annotations):
    collection_url = f"/api/resource/{webmap}/annotation/"
    annotation_to_patch = created_annotations[0]
    annotation_id = annotation_to_patch["id"]
    item_url = f"{collection_url}{annotation_id}"

    new_style = {"circle": {"fill": {"color": "#9C27B0"}, "radius": 8}}
    patch_payload = {"style": new_style}
    response = ngw_webtest_app.put_json(item_url, patch_payload)
    assert response.status_code == 200
    get_response = ngw_webtest_app.get(item_url)
    assert get_response.status_code == 200
    patched_data = get_response.json
    assert patched_data["style"] == new_style

    updated_description = "Updated annotation 0 for style patch"
    description_update_payload = {"description": updated_description}
    response = ngw_webtest_app.put_json(item_url, description_update_payload)
    assert response.status_code == 200
    get_response = ngw_webtest_app.get(item_url)
    assert get_response.status_code == 200
    description_updated_data = get_response.json
    assert description_updated_data["description"] == updated_description

    updated_geom = "POINT (50 50)"
    geom_update_payload = {"geom": updated_geom}
    response = ngw_webtest_app.put_json(item_url, geom_update_payload)
    assert response.status_code == 200
    get_response = ngw_webtest_app.get(item_url)
    assert get_response.status_code == 200
    geom_updated_data = get_response.json
    assert geom_updated_data["geom"] == updated_geom
