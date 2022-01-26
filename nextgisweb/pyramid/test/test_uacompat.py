import pytest

from ..uacompat import parse_header


@pytest.mark.parametrize('value, expected', (
    ("Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:95.0) Gecko/20100101 Firefox/95.0", ('firefox', 95)),
    ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59", ('edge', 91)),
    ("Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko", ('ie', 11)),
    ("Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)", ('ie', 10)),
    ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36 OPR/38.0.2220.41", ('opera', 38)),
    ("Mozilla/5.0 (Macintosh; Intel Mac OS X 12_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15", ('safari', 15)),
    ("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", None),
    ("Mozilla/5.0 (compatible; YandexAccessibilityBot/3.0; +http://yandex.com/bots)", None),
    ("Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/534.34 (KHTML, like Gecko) wkhtmltoimage Safari/534.34", None),
))
def test_parser(value, expected):
    parsed = parse_header(value)
    assert parsed == expected


def test_redirect(ngw_env, ngw_webtest_app, ngw_auth_administrator):
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko"
    with ngw_env.pyramid.options.override({
        'uacompat.enabled': True,
        'uacompat.ie': False,
    }):
        resp = ngw_webtest_app.get('/resource/0', headers={
            "User-Agent": user_agent,
        }, status=303)
        redir = resp.headers['Location'].replace("http://localhost", "")
        assert redir == "/uacompat?next=%2Fresource%2F0&hash=9960451c"

        # Without the same User-Agent it must redirect to the original location
        resp = ngw_webtest_app.get(redir, status=303)
        redir_next = resp.headers['Location'].replace("http://localhost", "")
        assert redir_next == "/resource/0"

        # Inspect uacompat HTML page
        resp = ngw_webtest_app.get(redir, headers={
            "User-Agent": user_agent,
        }, status=200)

        # There is only one link to bypass compatibility test
        link = list(resp.lxml.iterlinks())[0][2].replace("http://localhost", "")
        assert link.startswith("/uacompat?bypass=1&")

        # Redirect to the original location is expected
        resp = ngw_webtest_app.get(link, headers={
            "User-Agent": user_agent,
        }, status=303)
        redir_cont = resp.headers['Location'].replace("http://localhost", "")
        assert ngw_webtest_app.cookies == {'ngw-uac': '9960451c'}
        assert redir_cont == redir_next

        # When ngw-uac cookie is set, the original location mustn't return 303
        resp = ngw_webtest_app.get(redir_cont, headers={
            "User-Agent": user_agent,
        }, status=200)
