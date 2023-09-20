import pytest

test_comp = "test"
test_name = "setting"


@pytest.fixture(scope="module", autouse=True)
def reset(ngw_env):
    yield

    ngw_env.core.settings_delete(test_comp, test_name)


@pytest.mark.parametrize(
    "value",
    (
        True,
        False,
        "abc",
        123,
        dict(key="value"),
        [1, "a", dict(k=0)],
        dict(we=dict(need=dict(to=dict(go="deeper")))),
    ),
)
def test_setting(value, ngw_env):
    ngw_env.core.settings_set(test_comp, test_name, value)
    assert ngw_env.core.settings_get(test_comp, test_name) == value


def test_setting_float(ngw_env):
    value = 1.23
    ngw_env.core.settings_set(test_comp, test_name, value)
    assert pytest.approx(ngw_env.core.settings_get(test_comp, test_name)) == value
