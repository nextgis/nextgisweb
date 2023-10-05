from collections import defaultdict

import pytest

from nextgisweb.env import load_all

from .. import Resource


def pytest_generate_tests(metafunc):
    if "resource_cls" in metafunc.fixturenames:
        load_all()
        metafunc.parametrize(
            "resource_cls",
            [pytest.param(cls, id=identity) for identity, cls in Resource.registry.items()],
        )


def test_requirement_ordering(resource_cls):
    requirements = resource_cls.class_requirements()

    dependencies = defaultdict(set)
    for req in requirements:
        dependencies[req.dst].add(req)

    for req in requirements:
        if req.attr is None:
            d = dependencies[req.src]
            assert len(d) == 0, "{} evaluated before {}".format(req, tuple(d))
        dependencies[req.dst].remove(req)
