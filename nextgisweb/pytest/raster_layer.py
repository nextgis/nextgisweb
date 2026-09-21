import pytest

__all__ = [
    "ngw_raster_layer_s3_storage",
]


@pytest.fixture(scope="session")
def ngw_raster_layer_s3_storage(ngw_env):
    opts = ngw_env.core.options.with_prefix("test.storage")

    for o in ("endpoint", "bucket", "access_key", "secret_key"):
        if o not in opts:
            pytest.skip(f"Option test.storage.{o} isn't set")

    return dict(
        endpoint=opts["endpoint"],
        bucket=opts["bucket"],
        access_key=opts["access_key"],
        secret_key=opts["secret_key"],
        prefix=opts["prefix"],
    )
