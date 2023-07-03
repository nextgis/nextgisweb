<%page args="section" />
<% section.content_box = False %>
<%namespace file="nextgisweb:pyramid/template/clean.mako" import="clean_html"/>


<div class="content-box">
    %if obj.description is None:
        <p class="empty"><i>${tr(_("Resource description is empty."))}</i></p>
    %else:
        ${ obj.description | clean_html, n }
    %endif
</div>