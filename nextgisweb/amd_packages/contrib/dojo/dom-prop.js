/*
	Copyright (c) 2004-2016, The JS Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dom-prop","exports ./_base/kernel ./sniff ./_base/lang ./dom ./dom-style ./dom-construct ./_base/connect".split(" "),function(f,q,h,r,m,t,l,n){function g(a){var d="";a=a.childNodes;for(var c=0,b;b=a[c];c++)8!=b.nodeType&&(d=1==b.nodeType?d+g(b):d+b.nodeValue);return d}var k={},u=1,p=q._scopeName+"attrid";h.add("dom-textContent",function(a,d,c){return"textContent"in c});f.names={"class":"className","for":"htmlFor",tabindex:"tabIndex",readonly:"readOnly",colspan:"colSpan",frameborder:"frameBorder",
rowspan:"rowSpan",textcontent:"textContent",valuetype:"valueType"};f.get=function(a,d){a=m.byId(a);var c=d.toLowerCase(),c=f.names[c]||d;return"textContent"!=c||h("dom-textContent")?a[c]:g(a)};f.set=function(a,d,c){a=m.byId(a);if(2==arguments.length&&"string"!=typeof d){for(var b in d)f.set(a,b,d[b]);return a}b=d.toLowerCase();b=f.names[b]||d;if("style"==b&&"string"!=typeof c)return t.set(a,c),a;if("innerHTML"==b)return h("ie")&&a.tagName.toLowerCase()in{col:1,colgroup:1,table:1,tbody:1,tfoot:1,thead:1,
tr:1,title:1}?(l.empty(a),a.appendChild(l.toDom(c,a.ownerDocument))):a[b]=c,a;if("textContent"==b&&!h("dom-textContent"))return l.empty(a),a.appendChild(a.ownerDocument.createTextNode(c)),a;if(r.isFunction(c)){var e=a[p];e||(e=u++,a[p]=e);k[e]||(k[e]={});var g=k[e][b];if(g)n.disconnect(g);else try{delete a[b]}catch(v){}c?k[e][b]=n.connect(a,b,c):a[b]=null;return a}a[b]=c;return a}});
//# sourceMappingURL=dom-prop.js.map