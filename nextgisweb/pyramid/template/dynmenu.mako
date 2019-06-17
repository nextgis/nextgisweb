<%page args="dynmenu, args" />

<% from nextgisweb import dynmenu as dm %>

<script>
    require([
        "dojo/ready",
        "svg4everybody/svg4everybody"
    ], function(
        ready,
        svg4everybody
    ){
        ready(function() {
            svg4everybody();
        });
    });
</script>

<ul class="sidebar-menu list-unstyled">
<% label = None %>
%for item in dynmenu.build(args):
    %if isinstance(item, dm.Label):
        <% label = item %>
    %elif isinstance(item, dm.Link):
        %if label is not None:
            <li class="sidebar-menu__heading heading">${tr(label.label)}</li>
            <% label = None %>
        %endif
        <% url = item.url(args) %>
        <li class="sidebar-menu__item${' sidebar-menu__item--selected' if url == request.url else ''}">

            %if item.icon:
                <a href="${url}" class="sidebar-menu__link text-withIcon text-withIcon_size_s">
                    <span class="text-withIcon__icon text-withIcon__icon_size_s">
                        <svg class="text-withIcon__pic svgIcon-${item.icon}"> <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${request.static_url('nextgisweb:static/svg/svg-symbols.svg')}#${item.icon}"></use></svg>
                    </span>
                    ${tr(item.label)}
                </a>
            %else:
                <a href="${url}" class="sidebar-menu__link">${tr(item.label)}</a>
            %endif

        </li>
    %endif
%endfor
</ul>
