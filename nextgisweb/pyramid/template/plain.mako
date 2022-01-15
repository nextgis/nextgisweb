<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <%
        if hasattr(self, 'title'):
            x_title = self.title()
        elif context.get('title'):
            x_title = tr(context['title'])
        else:
            x_title = None
    %>
    <title>${x_title if x_title else ""}</title>

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
            padding: 0 1em;
        }

        .container.limit-width {
            max-width: 50em;
        }
    </style>

    %if hasattr(self, 'head'):
        ${self.head()}
    %endif
</head>
<body><div class="wrap"><div class="container ${'limit-width' if context.get('limit_width', True) else ''}">
%if hasattr(next, 'body'):
    ${next.body()}
%elif message:
    %if x_title:
        <h2>${x_title}</h2>
    %endif
    <p>${message}</p>
%endif
</div></div></body>
</html>