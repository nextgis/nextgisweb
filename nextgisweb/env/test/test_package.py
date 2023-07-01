from ..package import pkginfo


def test_amd_packages():
    ap = pkginfo.amd_packages()
    assert ('dojo', 'external/dojo') in ap
    assert ('ngw-pyramid', 'nextgisweb:pyramid/amd/ngw-pyramid') in ap
    assert ('ngw-audit', 'nextgisweb:audit/amd/ngw-audit') in ap
