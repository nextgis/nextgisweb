import json
import os
import sys
from subprocess import check_output

from nextgisweb.imptool import module_path


def extract(fileobj, keywords, comment_tags, options):
    env = dict(os.environ)

    out = check_output(
        ['node', str(module_path('nextgisweb.i18n') / 'hbs.js')],
        stdin=fileobj, stderr=sys.stderr, env=env)

    for rec in json.loads(out):
        yield (rec['lineno'], '', rec['messages'], '')
