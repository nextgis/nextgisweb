<%page args="site_name, title"/>

<%! from nextgisweb.pyramid.api import preview_link_data %>

<%
    tags = {"og:site_name": site_name}
    if title:
        tags["og:title"] = tr(title)

    tags["og:url"] = request.url

    data = preview_link_data(request)
    if description := data["description"]:
        tags["og:description"] = tr(description)
    if image := data["image"]:
        tags["og:image"] = image
        tags["twitter:card"] = "summary"
%>

%for k, v in tags.items():
    <meta property="${k}" content="${v}" />
%endfor
