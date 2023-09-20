import re

KEYWORDS = ["gettext", "gettextString"]

QS = r"'(?:[^'\\]|\\.)*'"
QD = r'"(?:[^"\\]|\\.)*"'

RE_NEWLINE = re.compile(r"\r?\n")
RE = re.compile(
    r"{{\s*" + "(" + "|".join(KEYWORDS) + ")" + r"\s+" + "(" + "|".join([QS, QD]) + ")" r"\s*}}",
    re.MULTILINE,
)


def extract(fileobj, keywords, comment_tags, options):
    hbs = fileobj.read().decode("utf-8")

    last_char_idx = 0
    current_line = 1
    for match in RE.finditer(hbs):
        for n in RE_NEWLINE.finditer(hbs, last_char_idx, match.start(0)):
            current_line += 1
            last_char_idx = n.endpos
        quoted = match.group(2)
        qtype = quoted[0]
        message = quoted.replace("\\" + qtype, qtype)[1:-1]

        yield (current_line, "", message, "")
