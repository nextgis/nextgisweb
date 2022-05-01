<%! from markupsafe import Markup %>

<%def name="icon_svg(glyph)"><%
    return Markup(f'<svg class="icon" fill="currentColor"><use xlink:href="#icon-{glyph}"></use></svg>')
%></%def>
