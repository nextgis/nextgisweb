//>>built
define("dojox/charting/plot2d/Pie",["dojo/_base/lang","dojo/_base/array","dojo/_base/declare","./Base","./_PlotEvents","./common","dojox/gfx","dojox/gfx/matrix","dojox/lang/functional","dojox/lang/utils","dojo/has"],function(_1,_2,_3,_4,_5,dc,g,m,df,du,_6){
var _7=0.2;
return _3("dojox.charting.plot2d.Pie",[_4,_5],{defaultParams:{labels:true,ticks:false,fixed:true,precision:1,labelOffset:20,labelStyle:"default",htmlLabels:true,radGrad:"native",fanSize:5,startAngle:0},optionalParams:{radius:0,omitLabels:false,stroke:{},outline:{},shadow:{},fill:{},filter:{},styleFunc:null,font:"",fontColor:"",labelWiring:{}},constructor:function(_8,_9){
this.opt=_1.clone(this.defaultParams);
du.updateWithObject(this.opt,_9);
du.updateWithPattern(this.opt,_9,this.optionalParams);
this.axes=[];
this.run=null;
this.dyn=[];
this.runFilter=[];
},clear:function(){
this.inherited(arguments);
this.dyn=[];
this.run=null;
return this;
},setAxis:function(_a){
return this;
},addSeries:function(_b){
this.run=_b;
return this;
},getSeriesStats:function(){
return _1.delegate(dc.defaultStats);
},getRequiredColors:function(){
return this.run?this.run.data.length:0;
},render:function(_c,_d){
if(!this.dirty){
return this;
}
this.resetEvents();
this.dirty=false;
this._eventSeries={};
this.cleanGroup();
var s=this.group,t=this.chart.theme;
if(!this.run||!this.run.data.length){
return this;
}
var rx=(_c.width-_d.l-_d.r)/2,ry=(_c.height-_d.t-_d.b)/2,r=Math.min(rx,ry),_e="font" in this.opt?this.opt.font:t.series.font,_f,_10=m._degToRad(this.opt.startAngle),_11=_10,_12,_13,_14,_15,_16,_17=this.events();
var run=_2.map(this.run.data,function(_18,i){
if(typeof _18!="number"&&_18.hidden){
this.runFilter.push(i);
_18.hidden=false;
}
if(_2.some(this.runFilter,function(_19){
return _19==i;
})){
if(typeof _18=="number"){
return 0;
}else{
return {y:0,text:_18.text};
}
}else{
return _18;
}
},this);
this.dyn=[];
if("radius" in this.opt){
r=this.opt.radius;
_16=r-this.opt.labelOffset;
}
var _1a={cx:_d.l+rx,cy:_d.t+ry,r:r};
if(this.opt.shadow||t.shadow){
var _1b=this.opt.shadow||t.shadow;
var _1c=_1.clone(_1a);
_1c.cx+=_1b.dx;
_1c.cy+=_1b.dy;
s.createCircle(_1c).setFill(_1b.color).setStroke(_1b);
}
if(s.setFilter&&(this.opt.filter||t.filter)){
s.createCircle(_1a).setFill(t.series.stroke).setFilter(this.opt.filter||t.filter);
}
if(typeof run[0]=="number"){
_12=df.map(run,"x ? Math.max(x, 0) : 0");
if(df.every(_12,"<= 0")){
s.createCircle(_1a).setStroke(t.series.stroke);
this.dyn=_2.map(_12,function(){
return {};
});
return this;
}else{
_13=df.map(_12,"/this",df.foldl(_12,"+",0));
if(this.opt.labels){
_14=_2.map(_13,function(x){
return x>0?this._getLabel(x*100)+"%":"";
},this);
}
}
}else{
_12=df.map(run,"x ? Math.max(x.y, 0) : 0");
if(df.every(_12,"<= 0")){
s.createCircle(_1a).setStroke(t.series.stroke);
this.dyn=_2.map(_12,function(){
return {};
});
return this;
}else{
_13=df.map(_12,"/this",df.foldl(_12,"+",0));
if(this.opt.labels){
_14=_2.map(_13,function(x,i){
if(x<0){
return "";
}
var v=run[i];
return "text" in v?v.text:this._getLabel(x*100)+"%";
},this);
}
}
}
var _1d=df.map(run,function(v,i){
var _1e=[this.opt,this.run];
if(v!==null&&typeof v!="number"){
_1e.push(v);
}
if(this.opt.styleFunc){
_1e.push(this.opt.styleFunc(v));
}
return t.next("slice",_1e,true);
},this);
if(this.opt.labels){
_f=_e?g.normalizedLength(g.splitFontString(_e).size):0;
_15=df.foldl1(df.map(_14,function(_1f,i){
var _20=_1d[i].series.font;
return g._base._getTextBox(_1f,{font:_20}).w;
},this),"Math.max(a, b)")/2;
if(this.opt.labelOffset<0){
r=Math.min(rx-2*_15,ry-_f)+this.opt.labelOffset;
}
_16=r-this.opt.labelOffset;
}
var _21=new Array(_13.length);
_2.some(_13,function(_22,i){
if(_22<0){
return false;
}
var v=run[i],_23=_1d[i],_24,o;
if(_22==0){
this.dyn.push({fill:_23.series.fill,stroke:_23.series.stroke});
return false;
}
if(_22>=1){
_24=this._plotFill(_23.series.fill,_c,_d);
_24=this._shapeFill(_24,{x:_1a.cx-_1a.r,y:_1a.cy-_1a.r,width:2*_1a.r,height:2*_1a.r});
_24=this._pseudoRadialFill(_24,{x:_1a.cx,y:_1a.cy},_1a.r);
var _25=s.createCircle(_1a).setFill(_24).setStroke(_23.series.stroke);
this.dyn.push({fill:_24,stroke:_23.series.stroke});
if(_17){
o={element:"slice",index:i,run:this.run,shape:_25,x:i,y:typeof v=="number"?v:v.y,cx:_1a.cx,cy:_1a.cy,cr:r};
this._connectEvents(o);
_21[i]=o;
}
return false;
}
var end=_11+_22*2*Math.PI;
if(i+1==_13.length){
end=_10+2*Math.PI;
}
var _26=end-_11,x1=_1a.cx+r*Math.cos(_11),y1=_1a.cy+r*Math.sin(_11),x2=_1a.cx+r*Math.cos(end),y2=_1a.cy+r*Math.sin(end);
var _27=m._degToRad(this.opt.fanSize);
if(_23.series.fill&&_23.series.fill.type==="radial"&&this.opt.radGrad==="fan"&&_26>_27){
var _28=s.createGroup(),_29=Math.ceil(_26/_27),_2a=_26/_29;
_24=this._shapeFill(_23.series.fill,{x:_1a.cx-_1a.r,y:_1a.cy-_1a.r,width:2*_1a.r,height:2*_1a.r});
for(var j=0;j<_29;++j){
var _2b=j==0?x1:_1a.cx+r*Math.cos(_11+(j-_7)*_2a),_2c=j==0?y1:_1a.cy+r*Math.sin(_11+(j-_7)*_2a),_2d=j==_29-1?x2:_1a.cx+r*Math.cos(_11+(j+1+_7)*_2a),_2e=j==_29-1?y2:_1a.cy+r*Math.sin(_11+(j+1+_7)*_2a);
_28.createPath().moveTo(_1a.cx,_1a.cy).lineTo(_2b,_2c).arcTo(r,r,0,_2a>Math.PI,true,_2d,_2e).lineTo(_1a.cx,_1a.cy).closePath().setFill(this._pseudoRadialFill(_24,{x:_1a.cx,y:_1a.cy},r,_11+(j+0.5)*_2a,_11+(j+0.5)*_2a));
}
_28.createPath().moveTo(_1a.cx,_1a.cy).lineTo(x1,y1).arcTo(r,r,0,_26>Math.PI,true,x2,y2).lineTo(_1a.cx,_1a.cy).closePath().setStroke(_23.series.stroke);
_25=_28;
}else{
_25=s.createPath().moveTo(_1a.cx,_1a.cy).lineTo(x1,y1).arcTo(r,r,0,_26>Math.PI,true,x2,y2).lineTo(_1a.cx,_1a.cy).closePath().setStroke(_23.series.stroke);
_24=_23.series.fill;
if(_24&&_24.type==="radial"){
_24=this._shapeFill(_24,{x:_1a.cx-_1a.r,y:_1a.cy-_1a.r,width:2*_1a.r,height:2*_1a.r});
if(this.opt.radGrad==="linear"){
_24=this._pseudoRadialFill(_24,{x:_1a.cx,y:_1a.cy},r,_11,end);
}
}else{
if(_24&&_24.type==="linear"){
_24=this._plotFill(_24,_c,_d);
_24=this._shapeFill(_24,_25.getBoundingBox());
}
}
_25.setFill(_24);
}
this.dyn.push({fill:_24,stroke:_23.series.stroke});
if(_17){
o={element:"slice",index:i,run:this.run,shape:_25,x:i,y:typeof v=="number"?v:v.y,cx:_1a.cx,cy:_1a.cy,cr:r};
this._connectEvents(o);
_21[i]=o;
}
_11=end;
return false;
},this);
if(this.opt.labels){
var _2f=_6("dojo-bidi")&&this.chart.isRightToLeft();
if(this.opt.labelStyle=="default"){
_11=_10;
_2.some(_13,function(_30,i){
if(_30<=0){
return false;
}
var _31=_1d[i];
if(_30>=1){
this.renderLabel(s,_1a.cx,_1a.cy+_f/2,_14[i],_31,this.opt.labelOffset>0);
return true;
}
var end=_11+_30*2*Math.PI;
if(i+1==_13.length){
end=_10+2*Math.PI;
}
if(this.opt.omitLabels&&end-_11<0.001){
return false;
}
var _32=(_11+end)/2,x=_1a.cx+_16*Math.cos(_32),y=_1a.cy+_16*Math.sin(_32)+_f/2;
this.renderLabel(s,_2f?_c.width-x:x,y,_14[i],_31,this.opt.labelOffset>0);
_11=end;
return false;
},this);
}else{
if(this.opt.labelStyle=="columns"){
_11=_10;
var _33=this.opt.omitLabels;
var _34=[];
_2.forEach(_13,function(_35,i){
var end=_11+_35*2*Math.PI;
if(i+1==_13.length){
end=_10+2*Math.PI;
}
var _36=(_11+end)/2;
_34.push({angle:_36,left:Math.cos(_36)<0,theme:_1d[i],index:i,omit:_33?end-_11<0.001:false});
_11=end;
});
var _37=g._base._getTextBox("a",{font:_e}).h;
this._getProperLabelRadius(_34,_37,_1a.r*1.1);
_2.forEach(_34,function(_38,i){
if(!_38.omit){
var _39=_1a.cx-_1a.r*2,_3a=_1a.cx+_1a.r*2,_3b=g._base._getTextBox(_14[i],{font:_38.theme.series.font}).w,x=_1a.cx+_38.labelR*Math.cos(_38.angle),y=_1a.cy+_38.labelR*Math.sin(_38.angle),_3c=(_38.left)?(_39+_3b):(_3a-_3b),_3d=(_38.left)?_39:_3c;
var _3e=s.createPath().moveTo(_1a.cx+_1a.r*Math.cos(_38.angle),_1a.cy+_1a.r*Math.sin(_38.angle));
if(Math.abs(_38.labelR*Math.cos(_38.angle))<_1a.r*2-_3b){
_3e.lineTo(x,y);
}
_3e.lineTo(_3c,y).setStroke(_38.theme.series.labelWiring);
this.renderLabel(s,_2f?_c.width-_3b-_3d:_3d,y,_14[i],_38.theme,false,"left");
}
},this);
}
}
}
var esi=0;
this._eventSeries[this.run.name]=df.map(run,function(v){
return v<=0?null:_21[esi++];
});
if(_6("dojo-bidi")){
this._checkOrientation(this.group,_c,_d);
}
return this;
},_getProperLabelRadius:function(_3f,_40,_41){
var _42,_43,_44=1,_45=1;
if(_3f.length==1){
_3f[0].labelR=_41;
return;
}
for(var i=0;i<_3f.length;i++){
var _46=Math.abs(Math.sin(_3f[i].angle));
if(_3f[i].left){
if(_44>=_46){
_44=_46;
_42=_3f[i];
}
}else{
if(_45>=_46){
_45=_46;
_43=_3f[i];
}
}
}
_42.labelR=_43.labelR=_41;
this._calculateLabelR(_42,_3f,_40);
this._calculateLabelR(_43,_3f,_40);
},_calculateLabelR:function(_47,_48,_49){
var i=_47.index,_4a=_48.length,_4b=_47.labelR,_4c;
while(!(_48[i%_4a].left^_48[(i+1)%_4a].left)){
if(!_48[(i+1)%_4a].omit){
_4c=(Math.sin(_48[i%_4a].angle)*_4b+((_48[i%_4a].left)?(-_49):_49))/Math.sin(_48[(i+1)%_4a].angle);
_4b=(_4c<_47.labelR)?_47.labelR:_4c;
_48[(i+1)%_4a].labelR=_4b;
}
i++;
}
i=_47.index;
var j=(i==0)?_4a-1:i-1;
while(!(_48[i].left^_48[j].left)){
if(!_48[j].omit){
_4c=(Math.sin(_48[i].angle)*_4b+((_48[i].left)?_49:(-_49)))/Math.sin(_48[j].angle);
_4b=(_4c<_47.labelR)?_47.labelR:_4c;
_48[j].labelR=_4b;
}
i--;
j--;
i=(i<0)?i+_48.length:i;
j=(j<0)?j+_48.length:j;
}
}});
});
