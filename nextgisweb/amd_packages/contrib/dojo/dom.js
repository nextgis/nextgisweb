/*
	Copyright (c) 2004-2016, The JS Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dom",["./sniff","./_base/window","./_base/kernel"],function(f,h,g){if(7>=f("ie"))try{document.execCommand("BackgroundImageCache",!1,!0)}catch(a){}var e={};f("ie")?e.byId=function(a,b){if("string"!=typeof a)return a;var c=b||h.doc,d=a&&c.getElementById(a);if(!d||d.attributes.id.value!=a&&d.id!=a){c=c.all[a];if(!c||c.nodeName)c=[c];for(var e=0;d=c[e++];)if(d.attributes&&d.attributes.id&&d.attributes.id.value==a||d.id==a)return d}else return d}:e.byId=function(a,b){return("string"==typeof a?
(b||h.doc).getElementById(a):a)||null};g=g.global.document||null;f.add("dom-contains",!(!g||!g.contains));e.isDescendant=f("dom-contains")?function(a,b){return!(!(b=e.byId(b))||!b.contains(e.byId(a)))}:function(a,b){try{for(a=e.byId(a),b=e.byId(b);a;){if(a==b)return!0;a=a.parentNode}}catch(c){}return!1};f.add("css-user-select",function(a,b,c){if(!c)return!1;a=c.style;b=["Khtml","O","Moz","Webkit"];c=b.length;var d="userSelect";do if("undefined"!==typeof a[d])return d;while(c--&&(d=b[c]+"UserSelect"));
return!1});var k=f("css-user-select");e.setSelectable=k?function(a,b){e.byId(a).style[k]=b?"":"none"}:function(a,b){a=e.byId(a);var c=a.getElementsByTagName("*"),d=c.length;if(b)for(a.removeAttribute("unselectable");d--;)c[d].removeAttribute("unselectable");else for(a.setAttribute("unselectable","on");d--;)c[d].setAttribute("unselectable","on")};return e});
//# sourceMappingURL=dom.js.map