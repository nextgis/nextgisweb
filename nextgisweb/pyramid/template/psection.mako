<%inherit file='base.mako' />

<%!
    from dataclasses import dataclass
    from typing import Optional

    @dataclass
    class SectionRender:
        title: Optional[str] = None
        template: Optional[str] = None
        content_box: bool = True

%>

<%def name="render(ctx, section_render)" buffered="True">
    <%include file="${section_render.template}" args="section=section_render, **ctx"/>
</%def>

%for section in sections:
    <% ctx = section.is_applicable(obj) %>
    %if ctx:
        <%
            if not isinstance(ctx, dict): ctx = dict()
            section_render = SectionRender(title=section.title, template=section.template)
            html = render(ctx, section_render)
        %>

        %if section_render.title:
            <h2>${tr(section_render.title)}</h2>
        %endif

        %if section_render.content_box:
            <div class="content-box">${html | n}</div>
        %else:
            ${html | n}
        %endif
    %endif
%endfor