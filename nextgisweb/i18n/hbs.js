/* globals process */
var handlebars = require('handlebars/handlebars'),
    fs = require('fs');

var srctpl = fs.readFileSync('/dev/stdin', {encoding: 'utf-8'});
var struct = handlebars.parse(srctpl);

var result = [];

function traverse(node) {
    if (node.type == 'MustacheStatement') {
        var path = node.path;
        if (path.type == 'PathExpression' && path.original == 'gettext') {
            var params = node.params;
            if (params.length == 1 && params[0].type == 'StringLiteral') {
                result.push({
                    lineno: node.loc.start.line,
                    messages: [params[0].value]
                });
            }
        }
    }
}

struct.body.forEach(function (node) {traverse(node); });

process.stdout.write(JSON.stringify(result));
