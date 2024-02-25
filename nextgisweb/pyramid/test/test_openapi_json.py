def test_openapi_json(ngw_webtest_app):
    # TODO: Add validaion
    ngw_webtest_app.get("/openapi.json")
