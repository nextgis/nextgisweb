from ..package import amd_packages


def test_amd_packages():
    ap = amd_packages()
    assert ('dojo', 'external/dojo') in ap
    assert ('ngw-pyramid', 'nextgisweb:pyramid/amd/ngw-pyramid') in ap
    assert ('ngw-audit', 'nextgisweb:audit/amd/ngw-audit') in ap
