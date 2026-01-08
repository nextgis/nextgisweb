from urllib.parse import parse_qs, urlparse

import pytest

from nextgisweb.pyramid.test import WebTestApp

from ..uacompat import parse_header


# fmt: off
@pytest.mark.parametrize("expected, value", (
    # Desktop
    (("chrome", 100), "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.5026.191 Safari/537.36"),
    (("chrome", 135), "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"),
    (("safari", 15), "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15"),
    (("edge", 91),  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59"),
    (("firefox", 95), "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:95.0) Gecko/20100101 Firefox/95.0"),
    (("firefox", 137), "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0"),
    (("opera", 38), "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36 OPR/38.0.2220.41"),
    (("ie", 10), "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)"),
    (("ie", 11), "Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko"),
    # Mobile
    (("chrome", 135), "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.111 Mobile Safari/537.36"),
    (("safari", 15), "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.8.3 Mobile/19H386 Safari/604.1"),
    (("edge", 135), "Mozilla/5.0 (Linux; Android 10; HD1913) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.111 Mobile Safari/537.36 EdgA/135.0.3179.85"),
    (("firefox", 137),  "Mozilla/5.0 (Android 15; Mobile; rv:137.0) Gecko/137.0 Firefox/137.0"),
    # Chome on iOS
    (("safari", 14), "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1"),
    (("safari", 14), "Mozilla/5.0 (iPad; CPU iPad OS 14_2 like Mac OS X) AppleWebKit/532.2 (KHTML, like Gecko) CriOS/62.0.831.0 Mobile/58Z439 Safari/532.2"),
    (("safari", 15), "Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 CriOS/130.0.6723.469 Mobile/15E148 Safari/604.1"),
    (("safari", 15), "Mozilla/5.0 (iPad; CPU OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/96.0.4664.53 Mobile/15E148 Safari/604.1"),
    (("safari", 16), "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.6261.89 Mobile/15E148 Safari/604.1"),
    (("safari", 16), "Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1"),
    (("safari", 17), "Mozilla/5.0 (iPhone; CPU iPhone OS 17_7_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/136.0.7103.42 Mobile/15E148 Safari/604.1"),
    (("safari", 17), "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.6045.109 Mobile/15E148 Safari/604.1"),
    # Edge on iOS
    (("safari", 16), "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_10 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/131.0.2903.145 Version/16.0 Mobile/15E148 Safari/604.1"),
    (("safari", 17), "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/119.0.2151.105 Version/17.0 Mobile/15E148 Safari/604.1"),
    (("safari", 18), "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/131.0.2903.125 Version/18.0 Mobile/15E148 Safari/604.1"),
    # Firefox on iOS
    (("safari", 15), "Mozilla/5.0 (iPhone; CPU iPhone OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/99.3  Mobile/15E148 Safari/605.1.15"),
    (("safari", 16), "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_10 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/135.0  Mobile/15E148 Safari/605.1.15"),
    (("safari", 17), "Mozilla/5.0 (iPhone; CPU iPhone OS 17_7_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/137.0 Mobile/15E148 Safari/605.1.15"),
    (("safari", 18), "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/134.1  Mobile/15E148 Safari/605.1.15"),
    # Bots
    (None, "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"),
    (None, "Mozilla/5.0 (compatible; YandexAccessibilityBot/3.0; +http://yandex.com/bots)"),
    (None, "Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/534.34 (KHTML, like Gecko) wkhtmltoimage Safari/534.34"),
))
# fmt: on
def test_parser(value, expected):
    parsed = parse_header(value)
    assert parsed == expected


def test_redirect(ngw_env, ngw_webtest_app: WebTestApp, ngw_auth_administrator):
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Trident/7.0; rv:11.0) like Gecko"
    with ngw_env.pyramid.options.override(
        {
            "uacompat.enabled": True,
            "uacompat.ie": False,
        }
    ):
        resp = ngw_webtest_app.get(
            "/resource/0",
            headers={"User-Agent": user_agent},
            status=303,
        )
        redir = resp.headers["Location"].replace("http://localhost", "")
        up = urlparse(redir)
        assert up.path == "/uacompat"
        query = parse_qs(up.query)
        assert query["next"][0] == "/resource/0"
        assert query["hash"][0] == "9960451c"

        # Without the same User-Agent it must redirect to the original location
        resp = ngw_webtest_app.get(redir, status=303)
        redir_next = resp.headers["Location"].replace("http://localhost", "")
        assert redir_next == "/resource/0"

        # Inspect uacompat HTML page
        resp = ngw_webtest_app.get(
            redir,
            headers={"User-Agent": user_agent},
            status=200,
        )

        # There is only one link to bypass compatibility test
        link = list(resp.lxml.iterlinks())[0][2].replace("http://localhost", "")
        assert link.startswith("/uacompat?bypass=1&")

        # Redirect to the original location is expected
        resp = ngw_webtest_app.get(
            link,
            headers={"User-Agent": user_agent},
            status=303,
        )
        redir_cont = resp.headers["Location"].replace("http://localhost", "")
        assert ngw_webtest_app.cookies == {"ngw_uac": "9960451c"}
        assert redir_cont == redir_next

        # When ngw_uac cookie is set, the original location mustn't return 303
        resp = ngw_webtest_app.get(
            redir_cont,
            headers={"User-Agent": user_agent},
            status=200,
        )
