from collections import defaultdict

from ..model import Resource, resource_registry


def test_requirement_ordering():
    for cls in resource_registry.values():
        if cls is Resource:
            continue

        requirements = cls.class_requirements()

        dependencies = defaultdict(set)
        for req in requirements:
            dependencies[req.dst].add(req)

        for req in requirements:
            if req.attr is None:
                d = dependencies[req.src]
                assert len(d) == 0, "{} evaluated before {}".format(req, tuple(d))
            dependencies[req.dst].remove(req)
