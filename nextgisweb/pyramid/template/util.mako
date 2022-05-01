<%! from markupsafe import Markup %>

<%def name="icon_svg(glyph, cls=None)"><%
    cls = ' '.join(['icon'] + (cls.split(' ') if cls else []))
    return Markup(f'<svg class="{cls}" fill="currentColor"><use xlink:href="#icon-{glyph}"></use></svg>')
%></%def>
