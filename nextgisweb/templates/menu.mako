<%page args="dynmenu, args" />

<% from nextgisweb import dynmenu as dm %>

%for item in dynmenu.build(args):
    %if isinstance(item, dm.Label):
        <div style="padding-left: ${item.level}em; margin: 0.5ex 0;">${item.label}</div>
    %elif isinstance(item, dm.Link):
        <div style="padding-left: ${item.level}em; margin: 0.5ex 0;"><a href="${item.url(args)}">${item.label}</a></div>
    %endif
%endfor