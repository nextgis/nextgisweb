//>>built
define("dojox/charting/Chart",["../main","dojo/_base/lang","dojo/_base/array","dojo/_base/declare","dojo/dom-style","dojo/dom","dojo/dom-geometry","dojo/dom-construct","dojo/_base/Color","dojo/sniff","./Element","./SimpleTheme","./Series","./axis2d/common","dojox/gfx/shape","dojox/gfx","dojo/has!dojo-bidi?./bidi/Chart","dojox/lang/functional","dojox/lang/functional/fold","dojox/lang/functional/reversed"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d,_e,_f,g,_10,_11){
var dc=_2.getObject("charting",true,_1),_12=_11.lambda("item.clear()"),_13=_11.lambda("item.purgeGroup()"),_14=_11.lambda("item.destroy()"),_15=_11.lambda("item.dirty = false"),_16=_11.lambda("item.dirty = true"),_17=_11.lambda("item.name"),_18={l:10,t:10,r:10,b:10};
var _19=_4(_a("dojo-bidi")?"dojox.charting.NonBidiChart":"dojox.charting.Chart",null,{constructor:function(_1a,_1b){
if(!_1b){
_1b={};
}
this.margins=_1b.margins||_18;
this._customMargins=!!_1b.margins;
this.stroke=_1b.stroke;
this.fill=_1b.fill;
this.delayInMs=_1b.delayInMs||200;
this.title=_1b.title;
this.titleGap=_1b.titleGap;
this.titlePos=_1b.titlePos;
this.titleFont=_1b.titleFont;
this.titleFontColor=_1b.titleFontColor;
this.titleAlign=_1b.titleAlign;
this.chartTitle=null;
this.htmlLabels=true;
if("htmlLabels" in _1b){
this.htmlLabels=_1b.htmlLabels;
}
this.theme=null;
this.axes={};
this.stack=[];
this.plots={};
this.series=[];
this.runs={};
this.dirty=true;
this.node=_6.byId(_1a);
var box=_7.getMarginBox(_1a);
this.surface=g.createSurface(this.node,box.w||400,box.h||300);
if(this.surface.declaredClass.indexOf("vml")==-1){
this._nativeClip=true;
}
},destroy:function(){
_3.forEach(this.series,_14);
_3.forEach(this.stack,_14);
_11.forIn(this.axes,_14);
this.surface.destroy();
if(this.chartTitle&&this.chartTitle.tagName){
_8.destroy(this.chartTitle);
}
},getCoords:function(){
var _1c=this.node;
var s=_5.getComputedStyle(_1c),_1d=_7.getMarginBox(_1c,s);
var abs=_7.position(_1c,true);
_1d.x=abs.x;
_1d.y=abs.y;
return _1d;
},setTheme:function(_1e){
this.theme=_1e.clone();
if(!this._customMargins){
this.margins=this.theme.chart.margins||_18;
}
this.dirty=true;
return this;
},addAxis:function(_1f,_20){
var _21,_22=_20&&_20.type||"Default";
if(typeof _22=="string"){
if(!dc.axis2d||!dc.axis2d[_22]){
throw Error("Can't find axis: "+_22+" - Check "+"require() dependencies.");
}
_21=new dc.axis2d[_22](this,_20);
}else{
_21=new _22(this,_20);
}
_21.name=_1f;
_21.dirty=true;
if(_1f in this.axes){
this.axes[_1f].destroy();
}
this.axes[_1f]=_21;
this.dirty=true;
return this;
},getAxis:function(_23){
return this.axes[_23];
},removeAxis:function(_24){
if(_24 in this.axes){
this.axes[_24].destroy();
delete this.axes[_24];
this.dirty=true;
}
return this;
},addPlot:function(_25,_26){
var _27,_28=_26&&_26.type||"Default";
if(typeof _28=="string"){
if(!dc.plot2d||!dc.plot2d[_28]){
throw Error("Can't find plot: "+_28+" - didn't you forget to dojo"+".require() it?");
}
_27=new dc.plot2d[_28](this,_26);
}else{
_27=new _28(this,_26);
}
_27.name=_25;
_27.dirty=true;
if(_25 in this.plots){
this.stack[this.plots[_25]].destroy();
this.stack[this.plots[_25]]=_27;
}else{
this.plots[_25]=this.stack.length;
this.stack.push(_27);
}
this.dirty=true;
return this;
},getPlot:function(_29){
return this.stack[this.plots[_29]];
},removePlot:function(_2a){
if(_2a in this.plots){
var _2b=this.plots[_2a];
delete this.plots[_2a];
this.stack[_2b].destroy();
this.stack.splice(_2b,1);
_11.forIn(this.plots,function(idx,_2c,_2d){
if(idx>_2b){
_2d[_2c]=idx-1;
}
});
var ns=_3.filter(this.series,function(run){
return run.plot!=_2a;
});
if(ns.length<this.series.length){
_3.forEach(this.series,function(run){
if(run.plot==_2a){
run.destroy();
}
});
this.runs={};
_3.forEach(ns,function(run,_2e){
this.runs[run.plot]=_2e;
},this);
this.series=ns;
}
this.dirty=true;
}
return this;
},getPlotOrder:function(){
return _11.map(this.stack,_17);
},setPlotOrder:function(_2f){
var _30={},_31=_11.filter(_2f,function(_32){
if(!(_32 in this.plots)||(_32 in _30)){
return false;
}
_30[_32]=1;
return true;
},this);
if(_31.length<this.stack.length){
_11.forEach(this.stack,function(_33){
var _34=_33.name;
if(!(_34 in _30)){
_31.push(_34);
}
});
}
var _35=_11.map(_31,function(_36){
return this.stack[this.plots[_36]];
},this);
_11.forEach(_35,function(_37,i){
this.plots[_37.name]=i;
},this);
this.stack=_35;
this.dirty=true;
return this;
},movePlotToFront:function(_38){
if(_38 in this.plots){
var _39=this.plots[_38];
if(_39){
var _3a=this.getPlotOrder();
_3a.splice(_39,1);
_3a.unshift(_38);
return this.setPlotOrder(_3a);
}
}
return this;
},movePlotToBack:function(_3b){
if(_3b in this.plots){
var _3c=this.plots[_3b];
if(_3c<this.stack.length-1){
var _3d=this.getPlotOrder();
_3d.splice(_3c,1);
_3d.push(_3b);
return this.setPlotOrder(_3d);
}
}
return this;
},addSeries:function(_3e,_3f,_40){
var run=new _d(this,_3f,_40);
run.name=_3e;
if(_3e in this.runs){
this.series[this.runs[_3e]].destroy();
this.series[this.runs[_3e]]=run;
}else{
this.runs[_3e]=this.series.length;
this.series.push(run);
}
this.dirty=true;
if(!("ymin" in run)&&"min" in run){
run.ymin=run.min;
}
if(!("ymax" in run)&&"max" in run){
run.ymax=run.max;
}
return this;
},getSeries:function(_41){
return this.series[this.runs[_41]];
},removeSeries:function(_42){
if(_42 in this.runs){
var _43=this.runs[_42];
delete this.runs[_42];
this.series[_43].destroy();
this.series.splice(_43,1);
_11.forIn(this.runs,function(idx,_44,_45){
if(idx>_43){
_45[_44]=idx-1;
}
});
this.dirty=true;
}
return this;
},updateSeries:function(_46,_47,_48){
if(_46 in this.runs){
var run=this.series[this.runs[_46]];
run.update(_47);
if(_48){
this.dirty=true;
}else{
this._invalidateDependentPlots(run.plot,false);
this._invalidateDependentPlots(run.plot,true);
}
}
return this;
},getSeriesOrder:function(_49){
return _11.map(_11.filter(this.series,function(run){
return run.plot==_49;
}),_17);
},setSeriesOrder:function(_4a){
var _4b,_4c={},_4d=_11.filter(_4a,function(_4e){
if(!(_4e in this.runs)||(_4e in _4c)){
return false;
}
var run=this.series[this.runs[_4e]];
if(_4b){
if(run.plot!=_4b){
return false;
}
}else{
_4b=run.plot;
}
_4c[_4e]=1;
return true;
},this);
_11.forEach(this.series,function(run){
var _4f=run.name;
if(!(_4f in _4c)&&run.plot==_4b){
_4d.push(_4f);
}
});
var _50=_11.map(_4d,function(_51){
return this.series[this.runs[_51]];
},this);
this.series=_50.concat(_11.filter(this.series,function(run){
return run.plot!=_4b;
}));
_11.forEach(this.series,function(run,i){
this.runs[run.name]=i;
},this);
this.dirty=true;
return this;
},moveSeriesToFront:function(_52){
if(_52 in this.runs){
var _53=this.runs[_52],_54=this.getSeriesOrder(this.series[_53].plot);
if(_52!=_54[0]){
_54.splice(_53,1);
_54.unshift(_52);
return this.setSeriesOrder(_54);
}
}
return this;
},moveSeriesToBack:function(_55){
if(_55 in this.runs){
var _56=this.runs[_55],_57=this.getSeriesOrder(this.series[_56].plot);
if(_55!=_57[_57.length-1]){
_57.splice(_56,1);
_57.push(_55);
return this.setSeriesOrder(_57);
}
}
return this;
},resize:function(_58,_59){
switch(arguments.length){
case 1:
_7.setMarginBox(this.node,_58);
break;
case 2:
_7.setMarginBox(this.node,{w:_58,h:_59});
break;
}
var box=_7.getMarginBox(this.node);
var d=this.surface.getDimensions();
if(d.width!=box.w||d.height!=box.h){
this.surface.setDimensions(box.w,box.h);
this.dirty=true;
return this.render();
}else{
return this;
}
},getGeometry:function(){
var ret={};
_11.forIn(this.axes,function(_5a){
if(_5a.initialized()){
ret[_5a.name]={name:_5a.name,vertical:_5a.vertical,scaler:_5a.scaler,ticks:_5a.ticks};
}
});
return ret;
},setAxisWindow:function(_5b,_5c,_5d,_5e){
var _5f=this.axes[_5b];
if(_5f){
_5f.setWindow(_5c,_5d);
_3.forEach(this.stack,function(_60){
if(_60.hAxis==_5b||_60.vAxis==_5b){
_60.zoom=_5e;
}
});
}
return this;
},setWindow:function(sx,sy,dx,dy,_61){
if(!("plotArea" in this)){
this.calculateGeometry();
}
_11.forIn(this.axes,function(_62){
var _63,_64,_65=_62.getScaler().bounds,s=_65.span/(_65.upper-_65.lower);
if(_62.vertical){
_63=sy;
_64=dy/s/_63;
}else{
_63=sx;
_64=dx/s/_63;
}
_62.setWindow(_63,_64);
});
_3.forEach(this.stack,function(_66){
_66.zoom=_61;
});
return this;
},zoomIn:function(_67,_68,_69){
var _6a=this.axes[_67];
if(_6a){
var _6b,_6c,_6d=_6a.getScaler().bounds;
var _6e=Math.min(_68[0],_68[1]);
var _6f=Math.max(_68[0],_68[1]);
_6e=_68[0]<_6d.lower?_6d.lower:_6e;
_6f=_68[1]>_6d.upper?_6d.upper:_6f;
_6b=(_6d.upper-_6d.lower)/(_6f-_6e);
_6c=_6e-_6d.lower;
this.setAxisWindow(_67,_6b,_6c);
if(_69){
this.delayedRender();
}else{
this.render();
}
}
},calculateGeometry:function(){
if(this.dirty){
return this.fullGeometry();
}
var _70=_3.filter(this.stack,function(_71){
return _71.dirty||(_71.hAxis&&this.axes[_71.hAxis].dirty)||(_71.vAxis&&this.axes[_71.vAxis].dirty);
},this);
_72(_70,this.plotArea);
return this;
},fullGeometry:function(){
this._makeDirty();
_3.forEach(this.stack,_12);
if(!this.theme){
this.setTheme(new _c());
}
_3.forEach(this.series,function(run){
if(!(run.plot in this.plots)){
if(!dc.plot2d||!dc.plot2d.Default){
throw Error("Can't find plot: Default - didn't you forget to dojo"+".require() it?");
}
var _73=new dc.plot2d.Default(this,{});
_73.name=run.plot;
this.plots[run.plot]=this.stack.length;
this.stack.push(_73);
}
this.stack[this.plots[run.plot]].addSeries(run);
},this);
_3.forEach(this.stack,function(_74){
if(_74.assignAxes){
_74.assignAxes(this.axes);
}
},this);
var dim=this.dim=this.surface.getDimensions();
dim.width=g.normalizedLength(dim.width);
dim.height=g.normalizedLength(dim.height);
_11.forIn(this.axes,_12);
_72(this.stack,dim);
var _75=this.offsets={l:0,r:0,t:0,b:0};
var _76=this;
_11.forIn(this.axes,function(_77){
if(_a("dojo-bidi")){
_76._resetLeftBottom(_77);
}
_11.forIn(_77.getOffsets(),function(o,i){
_75[i]=Math.max(o,_75[i]);
});
});
if(this.title){
this.titleGap=(this.titleGap==0)?0:this.titleGap||this.theme.chart.titleGap||20;
this.titlePos=this.titlePos||this.theme.chart.titlePos||"top";
this.titleFont=this.titleFont||this.theme.chart.titleFont;
this.titleFontColor=this.titleFontColor||this.theme.chart.titleFontColor||"black";
this.titleAlign=this.titleAlign||this.theme&&this.theme.chart&&this.theme.chart.titleAlign||"middle";
var _78=g.normalizedLength(g.splitFontString(this.titleFont).size);
_75[this.titlePos=="top"?"t":"b"]+=(_78+this.titleGap);
}
_11.forIn(this.margins,function(o,i){
_75[i]+=o;
});
this.plotArea={width:dim.width-_75.l-_75.r,height:dim.height-_75.t-_75.b};
_11.forIn(this.axes,_12);
_72(this.stack,this.plotArea);
return this;
},render:function(){
if(this._delayedRenderHandle){
clearTimeout(this._delayedRenderHandle);
this._delayedRenderHandle=null;
}
if(this.theme){
this.theme.clear();
}
if(this.dirty){
return this.fullRender();
}
this.calculateGeometry();
_11.forEachRev(this.stack,function(_79){
_79.render(this.dim,this.offsets);
},this);
_11.forIn(this.axes,function(_7a){
_7a.render(this.dim,this.offsets);
},this);
this._makeClean();
return this;
},fullRender:function(){
this.fullGeometry();
var _7b=this.offsets,dim=this.dim;
var w=Math.max(0,dim.width-_7b.l-_7b.r),h=Math.max(0,dim.height-_7b.t-_7b.b);
_3.forEach(this.series,_13);
_11.forIn(this.axes,_13);
_3.forEach(this.stack,_13);
var _7c=this.surface.children;
if(_f.dispose){
for(var i=0;i<_7c.length;++i){
_f.dispose(_7c[i]);
}
}
if(this.chartTitle&&this.chartTitle.tagName){
_8.destroy(this.chartTitle);
}
this.surface.clear();
this.chartTitle=null;
this._renderChartBackground(dim,_7b);
if(this._nativeClip){
this._renderPlotBackground(dim,_7b,w,h);
}else{
this._renderPlotBackground(dim,_7b,w,h);
}
_11.foldr(this.stack,function(z,_7d){
return _7d.render(dim,_7b),0;
},0);
if(!this._nativeClip){
this._renderChartBackground(dim,_7b);
}
if(this.title){
this._renderTitle(dim,_7b);
}
_11.forIn(this.axes,function(_7e){
_7e.render(dim,_7b);
});
this._makeClean();
return this;
},_renderTitle:function(dim,_7f){
var _80=(g.renderer=="canvas")&&this.htmlLabels,_81=_80||!_a("ie")&&!_a("opera")&&this.htmlLabels?"html":"gfx",_82=g.normalizedLength(g.splitFontString(this.titleFont).size),_83=g._base._getTextBox(this.title,{font:this.titleFont});
var _84=this.titleAlign;
var _85=_a("dojo-bidi")&&this.isRightToLeft();
var _86=dim.width/2;
if(_84==="edge"){
_84="left";
if(_85){
_86=dim.width-(_7f.r+_83.w);
}else{
_86=_7f.l;
}
}else{
if(_84!="middle"){
if(_85){
_84=_84==="left"?"right":"left";
}
if(_84==="left"){
_86=this.margins.l;
}else{
if(_84==="right"){
_84="left";
_86=dim.width-(this.margins.l+_83.w);
}
}
}
}
this.chartTitle=_e.createText[_81](this,this.surface,_86,this.titlePos=="top"?_82+this.margins.t:dim.height-this.margins.b,_84,this.title,this.titleFont,this.titleFontColor);
},_renderChartBackground:function(dim,_87){
var t=this.theme,_88;
var _89=this.fill!==undefined?this.fill:(t.chart&&t.chart.fill);
var _8a=this.stroke!==undefined?this.stroke:(t.chart&&t.chart.stroke);
if(_89=="inherit"){
var _8b=this.node;
_89=new _9(_5.get(_8b,"backgroundColor"));
while(_89.a==0&&_8b!=document.documentElement){
_89=new _9(_5.get(_8b,"backgroundColor"));
_8b=_8b.parentNode;
}
}
if(_89){
if(this._nativeClip){
_89=_b.prototype._shapeFill(_b.prototype._plotFill(_89,dim),{x:0,y:0,width:dim.width+1,height:dim.height+1});
this.surface.createRect({width:dim.width+1,height:dim.height+1}).setFill(_89);
}else{
_89=_b.prototype._plotFill(_89,dim,_87);
if(_87.l){
_88={x:0,y:0,width:_87.l,height:dim.height+1};
this.surface.createRect(_88).setFill(_b.prototype._shapeFill(_89,_88));
}
if(_87.r){
_88={x:dim.width-_87.r,y:0,width:_87.r+1,height:dim.height+2};
this.surface.createRect(_88).setFill(_b.prototype._shapeFill(_89,_88));
}
if(_87.t){
_88={x:0,y:0,width:dim.width+1,height:_87.t};
this.surface.createRect(_88).setFill(_b.prototype._shapeFill(_89,_88));
}
if(_87.b){
_88={x:0,y:dim.height-_87.b,width:dim.width+1,height:_87.b+2};
this.surface.createRect(_88).setFill(_b.prototype._shapeFill(_89,_88));
}
}
}
if(_8a){
this.surface.createRect({width:dim.width-1,height:dim.height-1}).setStroke(_8a);
}
},_renderPlotBackground:function(dim,_8c,w,h){
var t=this.theme;
var _8d=t.plotarea&&t.plotarea.fill;
var _8e=t.plotarea&&t.plotarea.stroke;
var _8f={x:_8c.l-1,y:_8c.t-1,width:w+2,height:h+2};
if(_8d){
_8d=_b.prototype._shapeFill(_b.prototype._plotFill(_8d,dim,_8c),_8f);
this.surface.createRect(_8f).setFill(_8d);
}
if(_8e){
this.surface.createRect({x:_8c.l,y:_8c.t,width:w+1,height:h+1}).setStroke(_8e);
}
},delayedRender:function(){
if(!this._delayedRenderHandle){
this._delayedRenderHandle=setTimeout(_2.hitch(this,function(){
this.render();
}),this.delayInMs);
}
return this;
},connectToPlot:function(_90,_91,_92){
return _90 in this.plots?this.stack[this.plots[_90]].connect(_91,_92):null;
},fireEvent:function(_93,_94,_95){
if(_93 in this.runs){
var _96=this.series[this.runs[_93]].plot;
if(_96 in this.plots){
var _97=this.stack[this.plots[_96]];
if(_97){
_97.fireEvent(_93,_94,_95);
}
}
}
return this;
},_makeClean:function(){
_3.forEach(this.axes,_15);
_3.forEach(this.stack,_15);
_3.forEach(this.series,_15);
this.dirty=false;
},_makeDirty:function(){
_3.forEach(this.axes,_16);
_3.forEach(this.stack,_16);
_3.forEach(this.series,_16);
this.dirty=true;
},_invalidateDependentPlots:function(_98,_99){
if(_98 in this.plots){
var _9a=this.stack[this.plots[_98]],_9b,_9c=_99?"vAxis":"hAxis";
if(_9a[_9c]){
_9b=this.axes[_9a[_9c]];
if(_9b&&_9b.dependOnData()){
_9b.dirty=true;
_3.forEach(this.stack,function(p){
if(p[_9c]&&p[_9c]==_9a[_9c]){
p.dirty=true;
}
});
}
}else{
_9a.dirty=true;
}
}
},setDir:function(dir){
return this;
},_resetLeftBottom:function(_9d){
},formatTruncatedLabel:function(_9e,_9f,_a0){
}});
function _a1(_a2){
return {min:_a2.hmin,max:_a2.hmax};
};
function _a3(_a4){
return {min:_a4.vmin,max:_a4.vmax};
};
function _a5(_a6,h){
_a6.hmin=h.min;
_a6.hmax=h.max;
};
function _a7(_a8,v){
_a8.vmin=v.min;
_a8.vmax=v.max;
};
function _a9(_aa,_ab){
if(_aa&&_ab){
_aa.min=Math.min(_aa.min,_ab.min);
_aa.max=Math.max(_aa.max,_ab.max);
}
return _aa||_ab;
};
function _72(_ac,_ad){
var _ae={},_af={};
_3.forEach(_ac,function(_b0){
var _b1=_ae[_b0.name]=_b0.getSeriesStats();
if(_b0.hAxis){
_af[_b0.hAxis]=_a9(_af[_b0.hAxis],_a1(_b1));
}
if(_b0.vAxis){
_af[_b0.vAxis]=_a9(_af[_b0.vAxis],_a3(_b1));
}
});
_3.forEach(_ac,function(_b2){
var _b3=_ae[_b2.name];
if(_b2.hAxis){
_a5(_b3,_af[_b2.hAxis]);
}
if(_b2.vAxis){
_a7(_b3,_af[_b2.vAxis]);
}
_b2.initializeScalers(_ad,_b3);
});
};
return _a("dojo-bidi")?_4("dojox.charting.Chart",[_19,_10]):_19;
});
