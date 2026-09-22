import{d as B,H as r,ab as j,P as b,bi as A,bj as O,bk as q,bl as M,bm as G,bn as S,aq as z,aa as a,ar as w,ad as L,ag as T,bo as _,ai as X,at as I,o as Y,c as H,a as R}from"./index-BWDkVURg.js";const V={success:r(G,null),error:r(M,null),warning:r(q,null),info:r(O,null)},E=B({name:"ProgressCircle",props:{clsPrefix:{type:String,required:!0},status:{type:String,required:!0},strokeWidth:{type:Number,required:!0},fillColor:[String,Object],railColor:String,railStyle:[String,Object],percentage:{type:Number,default:0},offsetDegree:{type:Number,default:0},showIndicator:{type:Boolean,required:!0},indicatorTextColor:String,unit:String,viewBoxWidth:{type:Number,required:!0},gapDegree:{type:Number,required:!0},gapOffsetDegree:{type:Number,default:0}},setup(e,{slots:u}){const c=b(()=>{const o="gradient",{fillColor:t}=e;return typeof t=="object"?`${o}-${A(JSON.stringify(t))}`:o});function m(o,t,n,g){const{gapDegree:p,viewBoxWidth:f,strokeWidth:h}=e,l=50,y=0,s=l,i=0,x=2*l,$=50+h/2,v=`M ${$},${$} m ${y},${s}
      a ${l},${l} 0 1 1 ${i},${-x}
      a ${l},${l} 0 1 1 ${-i},${x}`,C=Math.PI*2*l,k={stroke:g==="rail"?n:typeof e.fillColor=="object"?`url(#${c.value})`:n,strokeDasharray:`${Math.min(o,100)/100*(C-p)}px ${f*8}px`,strokeDashoffset:`-${p/2}px`,transformOrigin:t?"center":void 0,transform:t?`rotate(${t}deg)`:void 0};return{pathString:v,pathStyle:k}}const d=()=>{const o=typeof e.fillColor=="object",t=o?e.fillColor.stops[0]:"",n=o?e.fillColor.stops[1]:"";return o&&r("defs",null,r("linearGradient",{id:c.value,x1:"0%",y1:"100%",x2:"100%",y2:"0%"},r("stop",{offset:"0%","stop-color":t}),r("stop",{offset:"100%","stop-color":n})))};return()=>{const{fillColor:o,railColor:t,strokeWidth:n,offsetDegree:g,status:p,percentage:f,showIndicator:h,indicatorTextColor:l,unit:y,gapOffsetDegree:s,clsPrefix:i}=e,{pathString:x,pathStyle:$}=m(100,0,t,"rail"),{pathString:v,pathStyle:C}=m(f,g,o,"fill"),k=100+n;return r("div",{class:`${i}-progress-content`,role:"none"},r("div",{class:`${i}-progress-graph`,"aria-hidden":!0},r("div",{class:`${i}-progress-graph-circle`,style:{transform:s?`rotate(${s}deg)`:void 0}},r("svg",{viewBox:`0 0 ${k} ${k}`},d(),r("g",null,r("path",{class:`${i}-progress-graph-circle-rail`,d:x,"stroke-width":n,"stroke-linecap":"round",fill:"none",style:$})),r("g",null,r("path",{class:[`${i}-progress-graph-circle-fill`,f===0&&`${i}-progress-graph-circle-fill--empty`],d:v,"stroke-width":n,"stroke-linecap":"round",fill:"none",style:C}))))),h?r("div",null,u.default?r("div",{class:`${i}-progress-custom-content`,role:"none"},u.default()):p!=="default"?r("div",{class:`${i}-progress-icon`,"aria-hidden":!0},r(j,{clsPrefix:i},{default:()=>V[p]})):r("div",{class:`${i}-progress-text`,style:{color:l},role:"none"},r("span",{class:`${i}-progress-text__percentage`},f),r("span",{class:`${i}-progress-text__unit`},y))):null)}}}),F={success:r(G,null),error:r(M,null),warning:r(q,null),info:r(O,null)},J=B({name:"ProgressLine",props:{clsPrefix:{type:String,required:!0},percentage:{type:Number,default:0},railColor:String,railStyle:[String,Object],fillColor:[String,Object],status:{type:String,required:!0},indicatorPlacement:{type:String,required:!0},indicatorTextColor:String,unit:{type:String,default:"%"},processing:{type:Boolean,required:!0},showIndicator:{type:Boolean,required:!0},height:[String,Number],railBorderRadius:[String,Number],fillBorderRadius:[String,Number]},setup(e,{slots:u}){const c=b(()=>S(e.height)),m=b(()=>{var t,n;return typeof e.fillColor=="object"?`linear-gradient(to right, ${(t=e.fillColor)===null||t===void 0?void 0:t.stops[0]} , ${(n=e.fillColor)===null||n===void 0?void 0:n.stops[1]})`:e.fillColor}),d=b(()=>e.railBorderRadius!==void 0?S(e.railBorderRadius):e.height!==void 0?S(e.height,{c:.5}):""),o=b(()=>e.fillBorderRadius!==void 0?S(e.fillBorderRadius):e.railBorderRadius!==void 0?S(e.railBorderRadius):e.height!==void 0?S(e.height,{c:.5}):"");return()=>{const{indicatorPlacement:t,railColor:n,railStyle:g,percentage:p,unit:f,indicatorTextColor:h,status:l,showIndicator:y,processing:s,clsPrefix:i}=e;return r("div",{class:`${i}-progress-content`,role:"none"},r("div",{class:`${i}-progress-graph`,"aria-hidden":!0},r("div",{class:[`${i}-progress-graph-line`,{[`${i}-progress-graph-line--indicator-${t}`]:!0}]},r("div",{class:`${i}-progress-graph-line-rail`,style:[{backgroundColor:n,height:c.value,borderRadius:d.value},g]},r("div",{class:[`${i}-progress-graph-line-fill`,s&&`${i}-progress-graph-line-fill--processing`],style:{maxWidth:`${e.percentage}%`,background:m.value,height:c.value,lineHeight:c.value,borderRadius:o.value}},t==="inside"?r("div",{class:`${i}-progress-graph-line-indicator`,style:{color:h}},u.default?u.default():`${p}${f}`):null)))),y&&t==="outside"?r("div",null,u.default?r("div",{class:`${i}-progress-custom-content`,style:{color:h},role:"none"},u.default()):l==="default"?r("div",{role:"none",class:`${i}-progress-icon ${i}-progress-icon--as-text`,style:{color:h}},p,f):r("div",{class:`${i}-progress-icon`,"aria-hidden":!0},r(j,{clsPrefix:i},{default:()=>F[l]}))):null)}}});function W(e,u,c=100){return`m ${c/2} ${c/2-e} a ${e} ${e} 0 1 1 0 ${2*e} a ${e} ${e} 0 1 1 0 -${2*e}`}const K=B({name:"ProgressMultipleCircle",props:{clsPrefix:{type:String,required:!0},viewBoxWidth:{type:Number,required:!0},percentage:{type:Array,default:[0]},strokeWidth:{type:Number,required:!0},circleGap:{type:Number,required:!0},showIndicator:{type:Boolean,required:!0},fillColor:{type:Array,default:()=>[]},railColor:{type:Array,default:()=>[]},railStyle:{type:Array,default:()=>[]}},setup(e,{slots:u}){const c=b(()=>e.percentage.map((o,t)=>`${Math.PI*o/100*(e.viewBoxWidth/2-e.strokeWidth/2*(1+2*t)-e.circleGap*t)*2}, ${e.viewBoxWidth*8}`)),m=(d,o)=>{const t=e.fillColor[o],n=typeof t=="object"?t.stops[0]:"",g=typeof t=="object"?t.stops[1]:"";return typeof e.fillColor[o]=="object"&&r("linearGradient",{id:`gradient-${o}`,x1:"100%",y1:"0%",x2:"0%",y2:"100%"},r("stop",{offset:"0%","stop-color":n}),r("stop",{offset:"100%","stop-color":g}))};return()=>{const{viewBoxWidth:d,strokeWidth:o,circleGap:t,showIndicator:n,fillColor:g,railColor:p,railStyle:f,percentage:h,clsPrefix:l}=e;return r("div",{class:`${l}-progress-content`,role:"none"},r("div",{class:`${l}-progress-graph`,"aria-hidden":!0},r("div",{class:`${l}-progress-graph-circle`},r("svg",{viewBox:`0 0 ${d} ${d}`},r("defs",null,h.map((y,s)=>m(y,s))),h.map((y,s)=>r("g",{key:s},r("path",{class:`${l}-progress-graph-circle-rail`,d:W(d/2-o/2*(1+2*s)-t*s,o,d),"stroke-width":o,"stroke-linecap":"round",fill:"none",style:[{strokeDashoffset:0,stroke:p[s]},f[s]]}),r("path",{class:[`${l}-progress-graph-circle-fill`,y===0&&`${l}-progress-graph-circle-fill--empty`],d:W(d/2-o/2*(1+2*s)-t*s,o,d),"stroke-width":o,"stroke-linecap":"round",fill:"none",style:{strokeDasharray:c.value[s],strokeDashoffset:0,stroke:typeof g[s]=="object"?`url(#gradient-${s})`:g[s]}})))))),n&&u.default?r("div",null,r("div",{class:`${l}-progress-text`},u.default())):null)}}}),Z=z([a("progress",{display:"inline-block"},[a("progress-icon",`
 color: var(--n-icon-color);
 transition: color .3s var(--n-bezier);
 `),w("line",`
 width: 100%;
 display: block;
 `,[a("progress-content",`
 display: flex;
 align-items: center;
 `,[a("progress-graph",{flex:1})]),a("progress-custom-content",{marginLeft:"14px"}),a("progress-icon",`
 width: 30px;
 padding-left: 14px;
 height: var(--n-icon-size-line);
 line-height: var(--n-icon-size-line);
 font-size: var(--n-icon-size-line);
 `,[w("as-text",`
 color: var(--n-text-color-line-outer);
 text-align: center;
 width: 40px;
 font-size: var(--n-font-size);
 padding-left: 4px;
 transition: color .3s var(--n-bezier);
 `)])]),w("circle, dashboard",{width:"120px"},[a("progress-custom-content",`
 position: absolute;
 left: 50%;
 top: 50%;
 transform: translateX(-50%) translateY(-50%);
 display: flex;
 align-items: center;
 justify-content: center;
 `),a("progress-text",`
 position: absolute;
 left: 50%;
 top: 50%;
 transform: translateX(-50%) translateY(-50%);
 display: flex;
 align-items: center;
 color: inherit;
 font-size: var(--n-font-size-circle);
 color: var(--n-text-color-circle);
 font-weight: var(--n-font-weight-circle);
 transition: color .3s var(--n-bezier);
 white-space: nowrap;
 `),a("progress-icon",`
 position: absolute;
 left: 50%;
 top: 50%;
 transform: translateX(-50%) translateY(-50%);
 display: flex;
 align-items: center;
 color: var(--n-icon-color);
 font-size: var(--n-icon-size-circle);
 `)]),w("multiple-circle",`
 width: 200px;
 color: inherit;
 `,[a("progress-text",`
 font-weight: var(--n-font-weight-circle);
 color: var(--n-text-color-circle);
 position: absolute;
 left: 50%;
 top: 50%;
 transform: translateX(-50%) translateY(-50%);
 display: flex;
 align-items: center;
 justify-content: center;
 transition: color .3s var(--n-bezier);
 `)]),a("progress-content",{position:"relative"}),a("progress-graph",{position:"relative"},[a("progress-graph-circle",[z("svg",{verticalAlign:"bottom"}),a("progress-graph-circle-fill",`
 stroke: var(--n-fill-color);
 transition:
 opacity .3s var(--n-bezier),
 stroke .3s var(--n-bezier),
 stroke-dasharray .3s var(--n-bezier);
 `,[w("empty",{opacity:0})]),a("progress-graph-circle-rail",`
 transition: stroke .3s var(--n-bezier);
 overflow: hidden;
 stroke: var(--n-rail-color);
 `)]),a("progress-graph-line",[w("indicator-inside",[a("progress-graph-line-rail",`
 height: 16px;
 line-height: 16px;
 border-radius: 10px;
 `,[a("progress-graph-line-fill",`
 height: inherit;
 border-radius: 10px;
 `),a("progress-graph-line-indicator",`
 background: #0000;
 white-space: nowrap;
 text-align: right;
 margin-left: 14px;
 margin-right: 14px;
 height: inherit;
 font-size: 12px;
 color: var(--n-text-color-line-inner);
 transition: color .3s var(--n-bezier);
 `)])]),w("indicator-inside-label",`
 height: 16px;
 display: flex;
 align-items: center;
 `,[a("progress-graph-line-rail",`
 flex: 1;
 transition: background-color .3s var(--n-bezier);
 `),a("progress-graph-line-indicator",`
 background: var(--n-fill-color);
 font-size: 12px;
 transform: translateZ(0);
 display: flex;
 vertical-align: middle;
 height: 16px;
 line-height: 16px;
 padding: 0 10px;
 border-radius: 10px;
 position: absolute;
 white-space: nowrap;
 color: var(--n-text-color-line-inner);
 transition:
 right .2s var(--n-bezier),
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `)]),a("progress-graph-line-rail",`
 position: relative;
 overflow: hidden;
 height: var(--n-rail-height);
 border-radius: 5px;
 background-color: var(--n-rail-color);
 transition: background-color .3s var(--n-bezier);
 `,[a("progress-graph-line-fill",`
 background: var(--n-fill-color);
 position: relative;
 border-radius: 5px;
 height: inherit;
 width: 100%;
 max-width: 0%;
 transition:
 background-color .3s var(--n-bezier),
 max-width .2s var(--n-bezier);
 `,[w("processing",[z("&::after",`
 content: "";
 background-image: var(--n-line-bg-processing);
 animation: progress-processing-animation 2s var(--n-bezier) infinite;
 `)])])])])])]),z("@keyframes progress-processing-animation",`
 0% {
 position: absolute;
 left: 0;
 top: 0;
 bottom: 0;
 right: 100%;
 opacity: 1;
 }
 66% {
 position: absolute;
 left: 0;
 top: 0;
 bottom: 0;
 right: 0;
 opacity: 0;
 }
 100% {
 position: absolute;
 left: 0;
 top: 0;
 bottom: 0;
 right: 0;
 opacity: 0;
 }
 `)]),Q=Object.assign(Object.assign({},T.props),{processing:Boolean,type:{type:String,default:"line"},gapDegree:Number,gapOffsetDegree:Number,status:{type:String,default:"default"},railColor:[String,Array],railStyle:[String,Array],color:[String,Array,Object],viewBoxWidth:{type:Number,default:100},strokeWidth:{type:Number,default:7},percentage:[Number,Array],unit:{type:String,default:"%"},showIndicator:{type:Boolean,default:!0},indicatorPosition:{type:String,default:"outside"},indicatorPlacement:{type:String,default:"outside"},indicatorTextColor:String,circleGap:{type:Number,default:1},height:Number,borderRadius:[String,Number],fillBorderRadius:[String,Number],offsetDegree:Number}),re=B({name:"Progress",props:Q,setup(e){const u=b(()=>e.indicatorPlacement||e.indicatorPosition),c=b(()=>{if(e.gapDegree||e.gapDegree===0)return e.gapDegree;if(e.type==="dashboard")return 75}),{mergedClsPrefixRef:m,inlineThemeDisabled:d}=L(e),o=T("Progress","-progress",Z,_,e,m),t=b(()=>{const{status:g}=e,{common:{cubicBezierEaseInOut:p},self:{fontSize:f,fontSizeCircle:h,railColor:l,railHeight:y,iconSizeCircle:s,iconSizeLine:i,textColorCircle:x,textColorLineInner:$,textColorLineOuter:v,lineBgProcessing:C,fontWeightCircle:k,[I("iconColor",g)]:N,[I("fillColor",g)]:P}}=o.value;return{"--n-bezier":p,"--n-fill-color":P,"--n-font-size":f,"--n-font-size-circle":h,"--n-font-weight-circle":k,"--n-icon-color":N,"--n-icon-size-circle":s,"--n-icon-size-line":i,"--n-line-bg-processing":C,"--n-rail-color":l,"--n-rail-height":y,"--n-text-color-circle":x,"--n-text-color-line-inner":$,"--n-text-color-line-outer":v}}),n=d?X("progress",b(()=>e.status[0]),t,e):void 0;return{mergedClsPrefix:m,mergedIndicatorPlacement:u,gapDeg:c,cssVars:d?void 0:t,themeClass:n?.themeClass,onRender:n?.onRender}},render(){const{type:e,cssVars:u,indicatorTextColor:c,showIndicator:m,status:d,railColor:o,railStyle:t,color:n,percentage:g,viewBoxWidth:p,strokeWidth:f,mergedIndicatorPlacement:h,unit:l,borderRadius:y,fillBorderRadius:s,height:i,processing:x,circleGap:$,mergedClsPrefix:v,gapDeg:C,gapOffsetDegree:k,themeClass:N,$slots:P,onRender:D}=this;return D?.(),r("div",{class:[N,`${v}-progress`,`${v}-progress--${e}`,`${v}-progress--${d}`],style:u,"aria-valuemax":100,"aria-valuemin":0,"aria-valuenow":g,role:e==="circle"||e==="line"||e==="dashboard"?"progressbar":"none"},e==="circle"||e==="dashboard"?r(E,{clsPrefix:v,status:d,showIndicator:m,indicatorTextColor:c,railColor:o,fillColor:n,railStyle:t,offsetDegree:this.offsetDegree,percentage:g,viewBoxWidth:p,strokeWidth:f,gapDegree:C===void 0?e==="dashboard"?75:0:C,gapOffsetDegree:k,unit:l},P):e==="line"?r(J,{clsPrefix:v,status:d,showIndicator:m,indicatorTextColor:c,railColor:o,fillColor:n,railStyle:t,percentage:g,processing:x,indicatorPlacement:h,unit:l,fillBorderRadius:s,railBorderRadius:y,height:i},P):e==="multiple-circle"?r(K,{clsPrefix:v,strokeWidth:f,railColor:o,fillColor:n,railStyle:t,viewBoxWidth:p,percentage:g,showIndicator:m,circleGap:$},P):null)}}),U={xmlns:"http://www.w3.org/2000/svg","xmlns:xlink":"http://www.w3.org/1999/xlink",viewBox:"0 0 512 512"},te=B({name:"ServerOutline",render:function(u,c){return Y(),H("svg",U,c[0]||(c[0]=[R("ellipse",{cx:"256",cy:"128",rx:"192",ry:"80",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-miterlimit":"10","stroke-width":"32"},null,-1),R("path",{d:"M448 214c0 44.18-86 80-192 80S64 258.18 64 214",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-miterlimit":"10","stroke-width":"32"},null,-1),R("path",{d:"M448 300c0 44.18-86 80-192 80S64 344.18 64 300",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-miterlimit":"10","stroke-width":"32"},null,-1),R("path",{d:"M64 127.24v257.52C64 428.52 150 464 256 464s192-35.48 192-79.24V127.24",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-miterlimit":"10","stroke-width":"32"},null,-1)]))}});export{re as N,te as S};
