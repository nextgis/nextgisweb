<%page args="dynmenu, args" />

<% from nextgisweb import dynmenu as dm %>

<ul class="sidebar-menu list-unstyled">
%for item in dynmenu.build(args):
    %if isinstance(item, dm.Label):
        <li class="sidebar-menu__heading">${tr(item.label)}</li>
    %elif isinstance(item, dm.Link):
        <% url = item.url(args) %>
        <li class="sidebar-menu__item${' sidebar-menu__item--selected' if url == request.url else ''}">
            <a href="${url}" class="sidebar-menu__link">${tr(item.label)}</a>
        </li>
    %endif
%endfor
</ul>
