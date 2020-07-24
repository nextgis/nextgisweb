<%! from markupsafe import Markup %>

<%def name="icon(source, size='m')"><%
    t, n = source.split(':')
    if t == 'material':
        return Markup("<i class=\"material-icons icon-{0}\"></i>".format(n))
    elif t == 'svg':
        svg_url = request.static_url('nextgisweb:static/svg/svg-symbols.svg')
        return Markup("""
            <span class="text-withIcon__icon text-withIcon__icon_size_{2}">
                <svg class="text-withIcon__pic svgIcon-{0}">
                    <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="{1}#{0}"></use>
                </svg>
            </span>
        """.format(n, svg_url, size))
    else:
        raise ValueError("Invalid icon type: %s" % t)
%></%def>