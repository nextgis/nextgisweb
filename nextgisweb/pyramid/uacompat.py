from typing import Union, Optional
from dataclasses import dataclass
from functools import lru_cache
from binascii import crc32

from pyramid.httpexceptions import HTTPSeeOther
from pyramid.response import Response
from pyramid.events import NewRequest
from ua_parser import user_agent_parser

from ..lib.config import Option, OptionType, OptionAnnotations

FAMILIES = dict()
FOPTIONS = []


@dataclass(frozen=True)
class Family:
    identity: str
    alias: str
    required: Optional[Union[int, bool]]


class VersionOptionType(OptionType):

    def __str__(self):
        return 'int | bool'

    def loads(self, value):
        value = value.lower()
        if value in ('true', 'yes'):
            return True
        elif value in ('false', 'no'):
            return False
        else:
            return int(value)

    def dumps(self, value):
        return str(value).lower()


for f in (
    Family('chrome', 'Chrome', 94),
    Family('safari', 'Safari', 14),
    Family('edge', 'Edge', 94),
    Family('firefox', 'Firefox', 91),
    Family('opera', 'Opera', 76),
    Family('ie', 'Internet Explorer', False),
):
    FAMILIES[f.identity] = f
    FOPTIONS.append(Option(
        'uacompat.' + f.identity,
        otype=VersionOptionType,
        default=f.required))

option_annotations = OptionAnnotations([
    Option('uacompat.enabled', bool, default=True),
] + FOPTIONS)


@lru_cache(maxsize=64)
def parse_header(value):
    if value is None:
        return None
    parsed = user_agent_parser.ParseUserAgent(value)
    fid = parsed['family'].lower()
    if fid not in FAMILIES:
        return None
    return fid, int(parsed['major'])


def hash_header(value):
    return '{:x}'.format(crc32(value.encode('utf-8')))


def subscriber(event):
    request = event.request

    if request.method != 'GET' or request.path_info.startswith((
        '/api/',
        '/static/',
        '/uacompat',
        '/favicon.ico',
    )):
        return

    options = request.env.pyramid.options.with_prefix('uacompat')
    if not options['enabled']:
        return

    ua_str = request.user_agent

    if fam_ver := parse_header(ua_str):
        fam_id, cur = fam_ver
        req = options[fam_id]

        supported = req is True or (type(req) == int and req <= cur)

        if not supported:
            hash = hash_header(ua_str)
            if request.cookies.get('ngw-uac') == hash:
                return

            raise HTTPSeeOther(location=request.route_path(
                'pyramid.uacompat', _query=dict(
                    next=request.path_qs, hash=hash)))


def page(request):
    arg_next = request.GET.get('next', request.application_url)
    arg_hash = request.GET.get('hash', None)
    arg_bypass = request.GET.get('bypass', '0').lower() == '1'

    ua_str = request.GET.get('ua', request.user_agent)
    ua_hash = hash_header(ua_str) if ua_str is not None else None

    if arg_hash != ua_hash and arg_hash is not None:
        resp = Response(status=303, headerlist=[('Location', arg_next)])
        return resp

    if arg_bypass:
        resp = Response(status=303, headerlist=[('Location', arg_next)])
        resp.set_cookie('ngw-uac', ua_hash, max_age=86400)
        return resp

    fam_ver = parse_header(ua_str) if ua_str is not None else None

    ctx = dict()

    if fam_ver is not None:
        fam_id, cur = fam_ver
        fam = FAMILIES[fam_id]
        req = request.env.pyramid.options[f'uacompat.{fam_id}']
        ctx['fargs'] = dict(
            name=fam.alias, current=str(cur),
            required=str(req) if type(req) == int else None)

        supported = req is True or (type(req) == int and req <= cur)
        ctx['mode'] = 'supported' if supported else (
            'unsupported_browser' if req is False
            else 'unsupported_version')

        qa_bypass = dict(bypass='1', hash=ua_hash)
        if arg_next != request.application_url:
            qa_bypass['next'] = arg_next
        ctx['bypass'] = request.route_url(
            'pyramid.uacompat', _query=qa_bypass)

    else:
        ctx['mode'] = 'unknown'

    return ctx


def setup_pyramid(comp, config):
    config.add_subscriber(subscriber, NewRequest)

    config.add_route('pyramid.uacompat', '/uacompat') \
        .add_view(page, renderer='nextgisweb:pyramid/template/uacompat.mako')
