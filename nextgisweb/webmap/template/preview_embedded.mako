<%inherit file='nextgisweb:pyramid/template/base.mako' />

<%def name="head()">
    <style type="text/css">
        #content {
            overflow: auto;
        }
    </style>
</%def>

% if iframe:
    ${iframe | n}
% else:
    <div>
        <p>${tr(gettext('This page is for a preview of the web map to be embedded on the site.'))}</p>
        <p>${tr(gettext('Most likely, you went from the "Share" section of the web map and refreshed the page.'))}</p>
        <p>${tr(gettext('To generate a preview, go back to the web map page and click "Preview".'))}</p>
    </div>
% endif
