<!DOCTYPE html>
<% from nextgisweb.pyramid.util import _ %>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tr(_("Browser compatibility test"))}</title>
    <style type="text/css">
        html {
            box-sizing: border-box;
            font-size: 16px;
        }

        *, *:before, *:after {
            box-sizing: inherit;
        }

        body, h1, h2, h3, h4, h5, h6, p, ol, ul {
            margin: 0;
            padding: 0;
            font-weight: normal;
        }

        h1, h2, h3, p {
            padding: 1ex 0;
        }

        img {
            max-width: 100%;
            height: auto;
        }

        .wrap {
            text-align: center;
        }

        .container {
            text-align: left;
            margin: 0 auto;
            max-width: 50em;
            padding: 0 1em;
        }

        .supported {
            color: #3B3;
        }
        
        .unsupported {
            color: #B33;
        }
        
        .unknown {
            color: #333;
        }
    </style>
</head>
<body><div class="wrap"><div class="container">
    %if mode == 'supported':
        <h2 class="supported">${tr(_("%(name)s %(current)s supported") % fargs)}</h2>
        <p>${tr(_("Web GIS browser compatibility test has been passed! The Web GIS should work fine."))}
    %elif mode.startswith('unsupported_'):
        % if mode == 'unsupported_browser':
            <h2 class="unsupported">${tr(_("%(name)s not supported") % fargs)}</h2>
            <p>${tr(_("You're using %(name)s although it's not supported by the Web GIS. It's an outdated browser lacking required features. Try a different browser or contact your system administrator if another browser isn't available.") % fargs)}</p>
        %elif mode == 'unsupported_version':
            <h2 class="unsupported">${tr(_("%(name)s %(current)s not supported") % fargs)}</h2>
            <p>${tr(_("You're using %(name)s %(current)s although it's not supported by the Web GIS. It's an outdated version lacking required features. Contact your system administrator for upgrading to %(name)s %(required)s+ or try a different browser.") % fargs)}</p>
        %else:
            <% raise ValueError("Unknown mode value") %>
        %endif
        <p>${tr(_("If you still want to continue using the current browser, click the link below to bypass the compatibility test. The Web GIS or some features may degrade or fail  in this case."))}</p>
        <p><a href="${bypass}">${tr(_("I understood but want to proceed at my own risk. Skip the test!"))}</a></p>
    %elif mode == 'unknown':
        <h2 class="unknown">${tr(_("Unknown browser"))}</h2>
        <p>${tr(_("If you are using an up-to-date browser the Web GIS should be fine."))}</p>
    %else:
        <% raise ValueError("Unknown mode value") %>
    %endif
</div></div></body>
</html>