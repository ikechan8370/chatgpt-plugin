import{d as B,H as n,aa as X,P as $,am as Z,an as F,ao as Y,ap as J,aq as K,ar as j,as as M,a9 as g,at as R,ac as U,af as Q,au as ee,ah as te,av as G,p as re,o as b,c as C,a as o,l as oe,v as ne,g as W,t as I,e as N,w as _,u as f,a2 as A,B as q,Q as H,R as V,n as ie,j as D,I as le,k as se}from"./index-DiOlaFw7.js";import{f as ae}from"./channels-37ABqs0b.js";import{f as ce}from"./presets-BS3U3IDk.js";import{f as ue,a as de}from"./logs-B7zEGhPV.js";const ge={success:n(K,null),error:n(J,null),warning:n(Y,null),info:n(F,null)},pe=B({name:"ProgressCircle",props:{clsPrefix:{type:String,required:!0},status:{type:String,required:!0},strokeWidth:{type:Number,required:!0},fillColor:[String,Object],railColor:String,railStyle:[String,Object],percentage:{type:Number,default:0},offsetDegree:{type:Number,default:0},showIndicator:{type:Boolean,required:!0},indicatorTextColor:String,unit:String,viewBoxWidth:{type:Number,required:!0},gapDegree:{type:Number,required:!0},gapOffsetDegree:{type:Number,default:0}},setup(e,{slots:c}){const l=$(()=>{const s="gradient",{fillColor:i}=e;return typeof i=="object"?`${s}-${Z(JSON.stringify(i))}`:s});function y(s,i,a,p){const{gapDegree:h,viewBoxWidth:v,strokeWidth:x}=e,u=50,m=0,t=u,r=0,w=2*u,S=50+x/2,k=`M ${S},${S} m ${m},${t}
      a ${u},${u} 0 1 1 ${r},${-w}
      a ${u},${u} 0 1 1 ${-r},${w}`,P=Math.PI*2*u,z={stroke:p==="rail"?a:typeof e.fillColor=="object"?`url(#${l.value})`:a,strokeDasharray:`${Math.min(s,100)/100*(P-h)}px ${v*8}px`,strokeDashoffset:`-${h/2}px`,transformOrigin:i?"center":void 0,transform:i?`rotate(${i}deg)`:void 0};return{pathString:k,pathStyle:z}}const d=()=>{const s=typeof e.fillColor=="object",i=s?e.fillColor.stops[0]:"",a=s?e.fillColor.stops[1]:"";return s&&n("defs",null,n("linearGradient",{id:l.value,x1:"0%",y1:"100%",x2:"100%",y2:"0%"},n("stop",{offset:"0%","stop-color":i}),n("stop",{offset:"100%","stop-color":a})))};return()=>{const{fillColor:s,railColor:i,strokeWidth:a,offsetDegree:p,status:h,percentage:v,showIndicator:x,indicatorTextColor:u,unit:m,gapOffsetDegree:t,clsPrefix:r}=e,{pathString:w,pathStyle:S}=y(100,0,i,"rail"),{pathString:k,pathStyle:P}=y(v,p,s,"fill"),z=100+a;return n("div",{class:`${r}-progress-content`,role:"none"},n("div",{class:`${r}-progress-graph`,"aria-hidden":!0},n("div",{class:`${r}-progress-graph-circle`,style:{transform:t?`rotate(${t}deg)`:void 0}},n("svg",{viewBox:`0 0 ${z} ${z}`},d(),n("g",null,n("path",{class:`${r}-progress-graph-circle-rail`,d:w,"stroke-width":a,"stroke-linecap":"round",fill:"none",style:S})),n("g",null,n("path",{class:[`${r}-progress-graph-circle-fill`,v===0&&`${r}-progress-graph-circle-fill--empty`],d:k,"stroke-width":a,"stroke-linecap":"round",fill:"none",style:P}))))),x?n("div",null,c.default?n("div",{class:`${r}-progress-custom-content`,role:"none"},c.default()):h!=="default"?n("div",{class:`${r}-progress-icon`,"aria-hidden":!0},n(X,{clsPrefix:r},{default:()=>ge[h]})):n("div",{class:`${r}-progress-text`,style:{color:u},role:"none"},n("span",{class:`${r}-progress-text__percentage`},v),n("span",{class:`${r}-progress-text__unit`},m))):null)}}}),he={success:n(K,null),error:n(J,null),warning:n(Y,null),info:n(F,null)},fe=B({name:"ProgressLine",props:{clsPrefix:{type:String,required:!0},percentage:{type:Number,default:0},railColor:String,railStyle:[String,Object],fillColor:[String,Object],status:{type:String,required:!0},indicatorPlacement:{type:String,required:!0},indicatorTextColor:String,unit:{type:String,default:"%"},processing:{type:Boolean,required:!0},showIndicator:{type:Boolean,required:!0},height:[String,Number],railBorderRadius:[String,Number],fillBorderRadius:[String,Number]},setup(e,{slots:c}){const l=$(()=>j(e.height)),y=$(()=>{var i,a;return typeof e.fillColor=="object"?`linear-gradient(to right, ${(i=e.fillColor)===null||i===void 0?void 0:i.stops[0]} , ${(a=e.fillColor)===null||a===void 0?void 0:a.stops[1]})`:e.fillColor}),d=$(()=>e.railBorderRadius!==void 0?j(e.railBorderRadius):e.height!==void 0?j(e.height,{c:.5}):""),s=$(()=>e.fillBorderRadius!==void 0?j(e.fillBorderRadius):e.railBorderRadius!==void 0?j(e.railBorderRadius):e.height!==void 0?j(e.height,{c:.5}):"");return()=>{const{indicatorPlacement:i,railColor:a,railStyle:p,percentage:h,unit:v,indicatorTextColor:x,status:u,showIndicator:m,processing:t,clsPrefix:r}=e;return n("div",{class:`${r}-progress-content`,role:"none"},n("div",{class:`${r}-progress-graph`,"aria-hidden":!0},n("div",{class:[`${r}-progress-graph-line`,{[`${r}-progress-graph-line--indicator-${i}`]:!0}]},n("div",{class:`${r}-progress-graph-line-rail`,style:[{backgroundColor:a,height:l.value,borderRadius:d.value},p]},n("div",{class:[`${r}-progress-graph-line-fill`,t&&`${r}-progress-graph-line-fill--processing`],style:{maxWidth:`${e.percentage}%`,background:y.value,height:l.value,lineHeight:l.value,borderRadius:s.value}},i==="inside"?n("div",{class:`${r}-progress-graph-line-indicator`,style:{color:x}},c.default?c.default():`${h}${v}`):null)))),m&&i==="outside"?n("div",null,c.default?n("div",{class:`${r}-progress-custom-content`,style:{color:x},role:"none"},c.default()):u==="default"?n("div",{role:"none",class:`${r}-progress-icon ${r}-progress-icon--as-text`,style:{color:x}},h,v):n("div",{class:`${r}-progress-icon`,"aria-hidden":!0},n(X,{clsPrefix:r},{default:()=>he[u]}))):null)}}});function E(e,c,l=100){return`m ${l/2} ${l/2-e} a ${e} ${e} 0 1 1 0 ${2*e} a ${e} ${e} 0 1 1 0 -${2*e}`}const ve=B({name:"ProgressMultipleCircle",props:{clsPrefix:{type:String,required:!0},viewBoxWidth:{type:Number,required:!0},percentage:{type:Array,default:[0]},strokeWidth:{type:Number,required:!0},circleGap:{type:Number,required:!0},showIndicator:{type:Boolean,required:!0},fillColor:{type:Array,default:()=>[]},railColor:{type:Array,default:()=>[]},railStyle:{type:Array,default:()=>[]}},setup(e,{slots:c}){const l=$(()=>e.percentage.map((s,i)=>`${Math.PI*s/100*(e.viewBoxWidth/2-e.strokeWidth/2*(1+2*i)-e.circleGap*i)*2}, ${e.viewBoxWidth*8}`)),y=(d,s)=>{const i=e.fillColor[s],a=typeof i=="object"?i.stops[0]:"",p=typeof i=="object"?i.stops[1]:"";return typeof e.fillColor[s]=="object"&&n("linearGradient",{id:`gradient-${s}`,x1:"100%",y1:"0%",x2:"0%",y2:"100%"},n("stop",{offset:"0%","stop-color":a}),n("stop",{offset:"100%","stop-color":p}))};return()=>{const{viewBoxWidth:d,strokeWidth:s,circleGap:i,showIndicator:a,fillColor:p,railColor:h,railStyle:v,percentage:x,clsPrefix:u}=e;return n("div",{class:`${u}-progress-content`,role:"none"},n("div",{class:`${u}-progress-graph`,"aria-hidden":!0},n("div",{class:`${u}-progress-graph-circle`},n("svg",{viewBox:`0 0 ${d} ${d}`},n("defs",null,x.map((m,t)=>y(m,t))),x.map((m,t)=>n("g",{key:t},n("path",{class:`${u}-progress-graph-circle-rail`,d:E(d/2-s/2*(1+2*t)-i*t,s,d),"stroke-width":s,"stroke-linecap":"round",fill:"none",style:[{strokeDashoffset:0,stroke:h[t]},v[t]]}),n("path",{class:[`${u}-progress-graph-circle-fill`,m===0&&`${u}-progress-graph-circle-fill--empty`],d:E(d/2-s/2*(1+2*t)-i*t,s,d),"stroke-width":s,"stroke-linecap":"round",fill:"none",style:{strokeDasharray:l.value[t],strokeDashoffset:0,stroke:typeof p[t]=="object"?`url(#gradient-${t})`:p[t]}})))))),a&&c.default?n("div",null,n("div",{class:`${u}-progress-text`},c.default())):null)}}}),me=M([g("progress",{display:"inline-block"},[g("progress-icon",`
 color: var(--n-icon-color);
 transition: color .3s var(--n-bezier);
 `),R("line",`
 width: 100%;
 display: block;
 `,[g("progress-content",`
 display: flex;
 align-items: center;
 `,[g("progress-graph",{flex:1})]),g("progress-custom-content",{marginLeft:"14px"}),g("progress-icon",`
 width: 30px;
 padding-left: 14px;
 height: var(--n-icon-size-line);
 line-height: var(--n-icon-size-line);
 font-size: var(--n-icon-size-line);
 `,[R("as-text",`
 color: var(--n-text-color-line-outer);
 text-align: center;
 width: 40px;
 font-size: var(--n-font-size);
 padding-left: 4px;
 transition: color .3s var(--n-bezier);
 `)])]),R("circle, dashboard",{width:"120px"},[g("progress-custom-content",`
 position: absolute;
 left: 50%;
 top: 50%;
 transform: translateX(-50%) translateY(-50%);
 display: flex;
 align-items: center;
 justify-content: center;
 `),g("progress-text",`
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
 `),g("progress-icon",`
 position: absolute;
 left: 50%;
 top: 50%;
 transform: translateX(-50%) translateY(-50%);
 display: flex;
 align-items: center;
 color: var(--n-icon-color);
 font-size: var(--n-icon-size-circle);
 `)]),R("multiple-circle",`
 width: 200px;
 color: inherit;
 `,[g("progress-text",`
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
 `)]),g("progress-content",{position:"relative"}),g("progress-graph",{position:"relative"},[g("progress-graph-circle",[M("svg",{verticalAlign:"bottom"}),g("progress-graph-circle-fill",`
 stroke: var(--n-fill-color);
 transition:
 opacity .3s var(--n-bezier),
 stroke .3s var(--n-bezier),
 stroke-dasharray .3s var(--n-bezier);
 `,[R("empty",{opacity:0})]),g("progress-graph-circle-rail",`
 transition: stroke .3s var(--n-bezier);
 overflow: hidden;
 stroke: var(--n-rail-color);
 `)]),g("progress-graph-line",[R("indicator-inside",[g("progress-graph-line-rail",`
 height: 16px;
 line-height: 16px;
 border-radius: 10px;
 `,[g("progress-graph-line-fill",`
 height: inherit;
 border-radius: 10px;
 `),g("progress-graph-line-indicator",`
 background: #0000;
 white-space: nowrap;
 text-align: right;
 margin-left: 14px;
 margin-right: 14px;
 height: inherit;
 font-size: 12px;
 color: var(--n-text-color-line-inner);
 transition: color .3s var(--n-bezier);
 `)])]),R("indicator-inside-label",`
 height: 16px;
 display: flex;
 align-items: center;
 `,[g("progress-graph-line-rail",`
 flex: 1;
 transition: background-color .3s var(--n-bezier);
 `),g("progress-graph-line-indicator",`
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
 `)]),g("progress-graph-line-rail",`
 position: relative;
 overflow: hidden;
 height: var(--n-rail-height);
 border-radius: 5px;
 background-color: var(--n-rail-color);
 transition: background-color .3s var(--n-bezier);
 `,[g("progress-graph-line-fill",`
 background: var(--n-fill-color);
 position: relative;
 border-radius: 5px;
 height: inherit;
 width: 100%;
 max-width: 0%;
 transition:
 background-color .3s var(--n-bezier),
 max-width .2s var(--n-bezier);
 `,[R("processing",[M("&::after",`
 content: "";
 background-image: var(--n-line-bg-processing);
 animation: progress-processing-animation 2s var(--n-bezier) infinite;
 `)])])])])])]),M("@keyframes progress-processing-animation",`
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
 `)]),ye=Object.assign(Object.assign({},Q.props),{processing:Boolean,type:{type:String,default:"line"},gapDegree:Number,gapOffsetDegree:Number,status:{type:String,default:"default"},railColor:[String,Array],railStyle:[String,Array],color:[String,Array,Object],viewBoxWidth:{type:Number,default:100},strokeWidth:{type:Number,default:7},percentage:[Number,Array],unit:{type:String,default:"%"},showIndicator:{type:Boolean,default:!0},indicatorPosition:{type:String,default:"outside"},indicatorPlacement:{type:String,default:"outside"},indicatorTextColor:String,circleGap:{type:Number,default:1},height:Number,borderRadius:[String,Number],fillBorderRadius:[String,Number],offsetDegree:Number}),xe=B({name:"Progress",props:ye,setup(e){const c=$(()=>e.indicatorPlacement||e.indicatorPosition),l=$(()=>{if(e.gapDegree||e.gapDegree===0)return e.gapDegree;if(e.type==="dashboard")return 75}),{mergedClsPrefixRef:y,inlineThemeDisabled:d}=U(e),s=Q("Progress","-progress",me,ee,e,y),i=$(()=>{const{status:p}=e,{common:{cubicBezierEaseInOut:h},self:{fontSize:v,fontSizeCircle:x,railColor:u,railHeight:m,iconSizeCircle:t,iconSizeLine:r,textColorCircle:w,textColorLineInner:S,textColorLineOuter:k,lineBgProcessing:P,fontWeightCircle:z,[G("iconColor",p)]:L,[G("fillColor",p)]:O}}=s.value;return{"--n-bezier":h,"--n-fill-color":O,"--n-font-size":v,"--n-font-size-circle":x,"--n-font-weight-circle":z,"--n-icon-color":L,"--n-icon-size-circle":t,"--n-icon-size-line":r,"--n-line-bg-processing":P,"--n-rail-color":u,"--n-rail-height":m,"--n-text-color-circle":w,"--n-text-color-line-inner":S,"--n-text-color-line-outer":k}}),a=d?te("progress",$(()=>e.status[0]),i,e):void 0;return{mergedClsPrefix:y,mergedIndicatorPlacement:c,gapDeg:l,cssVars:d?void 0:i,themeClass:a?.themeClass,onRender:a?.onRender}},render(){const{type:e,cssVars:c,indicatorTextColor:l,showIndicator:y,status:d,railColor:s,railStyle:i,color:a,percentage:p,viewBoxWidth:h,strokeWidth:v,mergedIndicatorPlacement:x,unit:u,borderRadius:m,fillBorderRadius:t,height:r,processing:w,circleGap:S,mergedClsPrefix:k,gapDeg:P,gapOffsetDegree:z,themeClass:L,$slots:O,onRender:T}=this;return T?.(),n("div",{class:[L,`${k}-progress`,`${k}-progress--${e}`,`${k}-progress--${d}`],style:c,"aria-valuemax":100,"aria-valuemin":0,"aria-valuenow":p,role:e==="circle"||e==="line"||e==="dashboard"?"progressbar":"none"},e==="circle"||e==="dashboard"?n(pe,{clsPrefix:k,status:d,showIndicator:y,indicatorTextColor:l,railColor:s,fillColor:a,railStyle:i,offsetDegree:this.offsetDegree,percentage:p,viewBoxWidth:h,strokeWidth:v,gapDegree:P===void 0?e==="dashboard"?75:0:P,gapOffsetDegree:z,unit:u},O):e==="line"?n(fe,{clsPrefix:k,status:d,showIndicator:y,indicatorTextColor:l,railColor:s,fillColor:a,railStyle:i,percentage:p,processing:w,indicatorPlacement:x,unit:u,fillBorderRadius:t,railBorderRadius:m,height:r},O):e==="multiple-circle"?n(ve,{clsPrefix:k,strokeWidth:v,railColor:s,fillColor:a,railStyle:i,viewBoxWidth:h,percentage:p,showIndicator:y,circleGap:S},O):null)}});function ke(){return re.Get("/api/system/info")}const we={xmlns:"http://www.w3.org/2000/svg","xmlns:xlink":"http://www.w3.org/1999/xlink",viewBox:"0 0 512 512"},be=B({name:"AddOutline",render:function(c,l){return b(),C("svg",we,l[0]||(l[0]=[o("path",{fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32",d:"M256 112v288"},null,-1),o("path",{fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32",d:"M400 256H112"},null,-1)]))}}),Ce={xmlns:"http://www.w3.org/2000/svg","xmlns:xlink":"http://www.w3.org/1999/xlink",viewBox:"0 0 512 512"},$e=B({name:"ChatbubblesOutline",render:function(c,l){return b(),C("svg",Ce,l[0]||(l[0]=[o("path",{d:"M431 320.6c-1-3.6 1.2-8.6 3.3-12.2a33.68 33.68 0 0 1 2.1-3.1A162 162 0 0 0 464 215c.3-92.2-77.5-167-173.7-167c-83.9 0-153.9 57.1-170.3 132.9a160.7 160.7 0 0 0-3.7 34.2c0 92.3 74.8 169.1 171 169.1c15.3 0 35.9-4.6 47.2-7.7s22.5-7.2 25.4-8.3a26.44 26.44 0 0 1 9.3-1.7a26 26 0 0 1 10.1 2l56.7 20.1a13.52 13.52 0 0 0 3.9 1a8 8 0 0 0 8-8a12.85 12.85 0 0 0-.5-2.7z",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-miterlimit":"10","stroke-width":"32"},null,-1),o("path",{d:"M66.46 232a146.23 146.23 0 0 0 6.39 152.67c2.31 3.49 3.61 6.19 3.21 8s-11.93 61.87-11.93 61.87a8 8 0 0 0 2.71 7.68A8.17 8.17 0 0 0 72 464a7.26 7.26 0 0 0 2.91-.6l56.21-22a15.7 15.7 0 0 1 12 .2c18.94 7.38 39.88 12 60.83 12A159.21 159.21 0 0 0 284 432.11",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-miterlimit":"10","stroke-width":"32"},null,-1)]))}}),Se={xmlns:"http://www.w3.org/2000/svg","xmlns:xlink":"http://www.w3.org/1999/xlink",viewBox:"0 0 512 512"},Pe=B({name:"FlashOutline",render:function(c,l){return b(),C("svg",Se,l[0]||(l[0]=[o("path",{d:"M315.27 33L96 304h128l-31.51 173.23a2.36 2.36 0 0 0 2.33 2.77h0a2.36 2.36 0 0 0 1.89-.95L416 208H288l31.66-173.25a2.45 2.45 0 0 0-2.44-2.75h0a2.42 2.42 0 0 0-1.95 1z",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32"},null,-1)]))}}),ze={xmlns:"http://www.w3.org/2000/svg","xmlns:xlink":"http://www.w3.org/1999/xlink",viewBox:"0 0 512 512"},Be=B({name:"PulseOutline",render:function(c,l){return b(),C("svg",ze,l[0]||(l[0]=[o("path",{fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32",d:"M48 320h64l64-256l64 384l64-224l32 96h64"},null,-1),o("circle",{cx:"432",cy:"320",r:"32",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32"},null,-1)]))}}),Ne={xmlns:"http://www.w3.org/2000/svg","xmlns:xlink":"http://www.w3.org/1999/xlink",viewBox:"0 0 512 512"},Re=B({name:"ServerOutline",render:function(c,l){return b(),C("svg",Ne,l[0]||(l[0]=[o("ellipse",{cx:"256",cy:"128",rx:"192",ry:"80",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-miterlimit":"10","stroke-width":"32"},null,-1),o("path",{d:"M448 214c0 44.18-86 80-192 80S64 258.18 64 214",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-miterlimit":"10","stroke-width":"32"},null,-1),o("path",{d:"M448 300c0 44.18-86 80-192 80S64 344.18 64 300",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-miterlimit":"10","stroke-width":"32"},null,-1),o("path",{d:"M64 127.24v257.52C64 428.52 150 464 256 464s192-35.48 192-79.24V127.24",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-miterlimit":"10","stroke-width":"32"},null,-1)]))}}),Ie={xmlns:"http://www.w3.org/2000/svg","xmlns:xlink":"http://www.w3.org/1999/xlink",viewBox:"0 0 512 512"},Oe=B({name:"StatsChartOutline",render:function(c,l){return b(),C("svg",Ie,l[0]||(l[0]=[o("rect",{x:"64",y:"320",width:"48",height:"160",rx:"8",ry:"8",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32"},null,-1),o("rect",{x:"288",y:"224",width:"48",height:"256",rx:"8",ry:"8",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32"},null,-1),o("rect",{x:"400",y:"112",width:"48",height:"368",rx:"8",ry:"8",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32"},null,-1),o("rect",{x:"176",y:"32",width:"48",height:"448",rx:"8",ry:"8",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32"},null,-1)]))}}),De={class:"chaite-page cockpit"},je={class:"hero chaite-panel","data-tour":"dashboard"},We={class:"eyebrow"},_e={class:"hero-actions"},Le={class:"health-ring"},Me={class:"metric-grid"},qe=["onClick"],Te={class:"chaite-metric-label"},Ae={class:"main-grid"},Ge={class:"chaite-panel activity"},He={class:"section-title"},Ve={key:0,class:"empty"},Ee={class:"activity-icon"},Xe={class:"activity-copy"},Fe={class:"chaite-panel quick"},Ye=B({__name:"index",setup(e){const c=oe(),l=D(!0),y=D(),d=D(0),s=D(0),i=D(0),a=D(),p=D([]),h=$(()=>d.value?Math.round(s.value/d.value*100):0),v=$(()=>[{label:"渠道",value:d.value,hint:`${s.value} 个正在服务`,icon:Re,route:"/channels"},{label:"预设",value:i.value,hint:"角色与群聊配置",icon:$e,route:"/chat-preset"},{label:"24h 调用",value:a.value?.byType?.["llm.call"]??0,hint:`${(a.value?.totalTokens??0).toLocaleString()} tokens`,icon:Pe,route:"/logs"},{label:"平均延迟",value:`${a.value?.avgLlmDurationMs??0}ms`,hint:`错误率 ${((a.value?.errorRate??0)*100).toFixed(1)}%`,icon:Be,route:"/logs"}]);async function x(){l.value=!0;try{const[m,t,r,w,S]=await Promise.all([ke(),ae({pageSize:100}),ce({pageSize:100}),ue(),de({pageSize:8})]);m.isSuccess&&(y.value=m.data);const k=t.data,P=k?.items||k||[];d.value=P.length,s.value=P.filter(O=>O.status==="enabled").length;const z=r.data,L=z?.items||z||[];i.value=L.length,w.code===0&&(a.value=w.data),S.code===0&&(p.value=S.data.items)}finally{l.value=!1}}ne(x);function u(){window.dispatchEvent(new Event("chaite:start-tour"))}return(m,t)=>(b(),C("div",De,[o("section",je,[o("div",null,[o("div",We,[t[7]||(t[7]=o("span",{class:"live-dot"},null,-1)),W(" CHAITE CONSOLE · "+I(y.value?.version||"LOCAL"),1)]),t[11]||(t[11]=o("h1",null,"群聊 AI，一切就绪。",-1)),t[12]||(t[12]=o("p",null,"从这里掌握渠道健康、模型用量与最近异常，快速进入最常用的配置。",-1)),o("div",_e,[N(f(q),{type:"primary",size:"large",onClick:t[0]||(t[0]=r=>f(c).push("/quick-setup"))},{icon:_(()=>[N(f(A),{component:f(be)},null,8,["component"])]),default:_(()=>[t[8]||(t[8]=W("快速接入模型",-1))]),_:1}),N(f(q),{size:"large",secondary:"",onClick:t[1]||(t[1]=r=>f(c).push("/chat-preset"))},{default:_(()=>[...t[9]||(t[9]=[W("创建预设",-1)])]),_:1}),N(f(q),{text:"",onClick:u},{default:_(()=>[...t[10]||(t[10]=[W("查看新手引导",-1)])]),_:1})])]),o("div",Le,[N(f(xe),{type:"circle",percentage:h.value,"stroke-width":7,status:h.value>70?"success":h.value?"warning":"error"},null,8,["percentage","status"]),t[13]||(t[13]=o("span",null,"渠道可用率",-1))])]),o("section",Me,[(b(!0),C(H,null,V(v.value,r=>(b(),C("button",{key:r.label,class:"metric chaite-panel",onClick:w=>f(c).push(r.route)},[N(f(A),{component:r.icon,size:"24",class:"metric-icon"},null,8,["component"]),o("div",Te,I(r.label),1),o("strong",null,I(r.value),1),o("small",null,I(r.hint),1)],8,qe))),128))]),o("section",Ae,[o("div",Ge,[o("div",He,[t[15]||(t[15]=o("div",null,[o("h2",null,"最近活动"),o("p",null,"模型、工具和群聊能力的真实调用记录")],-1)),N(f(q),{text:"",type:"primary",onClick:t[2]||(t[2]=r=>f(c).push("/logs"))},{default:_(()=>[...t[14]||(t[14]=[W("查看全部",-1)])]),_:1})]),p.value.length?ie("",!0):(b(),C("div",Ve,"还没有使用记录。完成一次对话后，这里会出现详细数据。")),(b(!0),C(H,null,V(p.value,r=>(b(),C("div",{key:r.id,class:"activity-row"},[o("div",Ee,[N(f(A),{component:f(Oe)},null,8,["component"])]),o("div",Xe,[o("strong",null,I(r.summary),1),o("span",null,I(r.channelName||r.model||r.presetName||"系统")+" · "+I(new Date(r.timestamp).toLocaleString()),1)]),N(f(le),{size:"small",type:r.level==="error"?"error":"default",bordered:!1},{default:_(()=>[W(I(r.level==="error"?"异常":`${r.durationMs??0} ms`),1)]),_:2},1032,["type"])]))),128))]),o("aside",Fe,[t[20]||(t[20]=o("div",{class:"section-title"},[o("div",null,[o("h2",null,"快速管理"),o("p",null,"高频入口")])],-1)),o("button",{onClick:t[3]||(t[3]=r=>f(c).push("/channels"))},[...t[16]||(t[16]=[o("b",null,"渠道池",-1),o("span",null,"测试、启停与调整优先级",-1)])]),o("button",{onClick:t[4]||(t[4]=r=>f(c).push("/chat-preset"))},[...t[17]||(t[17]=[o("b",null,"预设库",-1),o("span",null,"搜索、复制和维护角色",-1)])]),o("button",{onClick:t[5]||(t[5]=r=>f(c).push("/tools"))},[...t[18]||(t[18]=[o("b",null,"工具与分组",-1),o("span",null,"组织模型可调用的能力",-1)])]),o("button",{onClick:t[6]||(t[6]=r=>f(c).push("/config"))},[...t[19]||(t[19]=[o("b",null,"系统配置",-1),o("span",null,"对话、视觉、记忆与服务",-1)])])])])]))}}),Ue=se(Ye,[["__scopeId","data-v-734eef69"]]);export{Ue as default};
