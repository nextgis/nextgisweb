import pytest

from .. import sanitize

PRESERVE = {
    "none": None,
    "empty": "",
    "plain": "Text",
    "unicode": "無无",
    "paragraph": "<p>Text</p>",
    "two-paragraphs": "<p>T</p><p>Text</p>",
    "data-url-img": '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">',
    "img-dims": '<img width="64" height="64" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">',
    "figure-img": '<figure><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><figcaption>Caption</figcaption></figure>',
    "1c-link": '<a href="e1c://server">Text</a>',
    "data-colon": '<a href="https://domain.org/path/data:colon"></a>',
    "feature-link": '<a href="123:456">Feature #456 of resource #123</a>',
}


@pytest.mark.parametrize("value", [pytest.param(v, id=k) for k, v in PRESERVE.items()])
def test_preserve(value):
    cleaned = sanitize(value)
    assert cleaned == value
    sanitize(value, validate=True)


CLEAN = {
    "html-doc": ("<html><head></head><body>Text</body></html>", "Text"),
    "comment": ("Some <!-- <script>alert()</script> --> text", "Some  text"),
    "unclosed": ("<div>Text", "<div>Text</div>"),
    "unopened": ("</div>Text", "Text"),
    "unballanced": ("<b><i>T</b></i>", "<b><i>T</i></b>"),
    "mixed-brs": ("1<br>2<br/>3", "1<br>2<br>3"),
    "js-tag": ("<p></p><script>alert()</script>", "<p></p>"),
    "js-href": ('<a href="javascript:alert()"></a>', "<a></a>"),
    "js-onclick": ('<div onclick="alert()"></div>', "<div></div>"),
    "data-unknown": ('<img src="data:unknown">', "<img>"),
    "style-tag": ("Some <style>a { color: red; }</style> text", "Some  text"),
    "style-breaking": ('<div style="position: fixed; inset: 0"/>', "<div></div>"),
    "style-font-weight": ('<span style="font-weight: bold"/>', "<span></span>"),
    "broken": ("Text<!@#$%INVALID", "Text"),
}


@pytest.mark.parametrize("value, expected", [pytest.param(*v, id=k) for k, v in CLEAN.items()])
def test_clean(value, expected):
    cleaned = sanitize(value)
    assert sanitize(cleaned) == cleaned, "Unstable result"
    assert cleaned == expected, "Unexpected result"
