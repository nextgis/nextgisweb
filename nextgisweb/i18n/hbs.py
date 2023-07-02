import json
import os
import sys
from pkg_resources import resource_filename
from subprocess import check_output


def extract(fileobj, keywords, comment_tags, options):
    env = dict(os.environ)

    out = check_output(
        ['node', resource_filename('nextgisweb', 'i18n/hbs.js')],
        stdin=fileobj, stderr=sys.stderr, env=env)

    for rec in json.loads(out):
        yield (rec['lineno'], '', rec['messages'], '')
