<%page args="site_name, title"/>
<%
    tags = {"og:site_name": site_name}
    if title:
        tags["og:title"] = tr(title)

    tags["og:url"] = request.url

    preview_link = request.env.pyramid.preview_link_view(request)
    if description := preview_link["description"]:
        tags["og:description"] = tr(description)
    if image := preview_link["image"]:
        tags["og:image"] = image
        tags["twitter:card"] = "summary"
%>

%for k, v in tags.items():
    <meta property="${k}" content="${v}" />
%endfor
