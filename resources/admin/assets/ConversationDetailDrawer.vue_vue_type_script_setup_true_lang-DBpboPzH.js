import K from"./MessageContentCard-2yw-Wtr8.js";import{bO as M,a8 as A,cr as Q,as as f,a9 as s,ch as X,at as v,d as w,H as a,c0 as Y,T as U,ac as P,af as S,cs as q,ah as I,P as y,b9 as G,bK as J,av as z,bY as Z,j as ee,ct as te,b1 as u,b5 as ie,aL as ne,aQ as R,a_ as _,aM as oe,a$ as re,ar as se,o as g,b as x,w as b,e as C,u as h,cu as le,c as j,W as ae,Q as ce,R as me,X as de,n as ue,cv as pe}from"./index-DiOlaFw7.js";let N=!1;function he(){if(M&&window.CSS&&!N&&(N=!0,"registerProperty"in window?.CSS))try{CSS.registerProperty({name:"--n-color-start",syntax:"<color>",inherits:!1,initialValue:"#0000"}),CSS.registerProperty({name:"--n-color-end",syntax:"<color>",inherits:!1,initialValue:"#0000"})}catch{}}function fe(e){const{textColor3:o,infoColor:t,errorColor:n,successColor:i,warningColor:l,textColor1:c,textColor2:m,railColor:r,fontWeightStrong:d,fontSize:p}=e;return Object.assign(Object.assign({},Q),{contentFontSize:p,titleFontWeight:d,circleBorder:`2px solid ${o}`,circleBorderInfo:`2px solid ${t}`,circleBorderError:`2px solid ${n}`,circleBorderSuccess:`2px solid ${i}`,circleBorderWarning:`2px solid ${l}`,iconColor:o,iconColorInfo:t,iconColorError:n,iconColorSuccess:i,iconColorWarning:l,titleTextColor:c,contentTextColor:m,metaTextColor:o,lineColor:r})}const ve={common:A,self:fe},ge=f([f("@keyframes spin-rotate",`
 from {
 transform: rotate(0);
 }
 to {
 transform: rotate(360deg);
 }
 `),s("spin-container",`
 position: relative;
 `,[s("spin-body",`
 position: absolute;
 top: 50%;
 left: 50%;
 transform: translateX(-50%) translateY(-50%);
 `,[X()])]),s("spin-body",`
 display: inline-flex;
 align-items: center;
 justify-content: center;
 flex-direction: column;
 `),s("spin",`
 display: inline-flex;
 height: var(--n-size);
 width: var(--n-size);
 font-size: var(--n-size);
 color: var(--n-color);
 `,[v("rotate",`
 animation: spin-rotate 2s linear infinite;
 `)]),s("spin-description",`
 display: inline-block;
 font-size: var(--n-font-size);
 color: var(--n-text-color);
 transition: color .3s var(--n-bezier);
 margin-top: 8px;
 `),s("spin-content",`
 opacity: 1;
 transition: opacity .3s var(--n-bezier);
 pointer-events: all;
 `,[v("spinning",`
 user-select: none;
 -webkit-user-select: none;
 pointer-events: none;
 opacity: var(--n-opacity-spinning);
 `)])]),ze={small:20,medium:18,large:16},ye=Object.assign(Object.assign(Object.assign({},S.props),{contentClass:String,contentStyle:[Object,String],description:String,size:{type:[String,Number],default:"medium"},show:{type:Boolean,default:!0},rotate:{type:Boolean,default:!0},spinning:{type:Boolean,validator:()=>!0,default:void 0},delay:Number}),te),be=w({name:"Spin",props:ye,slots:Object,setup(e){const{mergedClsPrefixRef:o,inlineThemeDisabled:t}=P(e),n=S("Spin","-spin",ge,q,e,o),i=y(()=>{const{size:r}=e,{common:{cubicBezierEaseInOut:d},self:p}=n.value,{opacitySpinning:$,color:T,textColor:k}=p,B=typeof r=="number"?J(r):p[z("size",r)];return{"--n-bezier":d,"--n-opacity-spinning":$,"--n-size":B,"--n-color":T,"--n-text-color":k}}),l=t?I("spin",y(()=>{const{size:r}=e;return typeof r=="number"?String(r):r[0]}),i,e):void 0,c=Z(e,["spinning","show"]),m=ee(!1);return G(r=>{let d;if(c.value){const{delay:p}=e;if(p){d=window.setTimeout(()=>{m.value=!0},p),r(()=>{clearTimeout(d)});return}}m.value=c.value}),{mergedClsPrefix:o,active:m,mergedStrokeWidth:y(()=>{const{strokeWidth:r}=e;if(r!==void 0)return r;const{size:d}=e;return ze[typeof d=="number"?"medium":d]}),cssVars:t?void 0:i,themeClass:l?.themeClass,onRender:l?.onRender}},render(){var e,o;const{$slots:t,mergedClsPrefix:n,description:i}=this,l=t.icon&&this.rotate,c=(i||t.description)&&a("div",{class:`${n}-spin-description`},i||((e=t.description)===null||e===void 0?void 0:e.call(t))),m=t.icon?a("div",{class:[`${n}-spin-body`,this.themeClass]},a("div",{class:[`${n}-spin`,l&&`${n}-spin--rotate`],style:t.default?"":this.cssVars},t.icon()),c):a("div",{class:[`${n}-spin-body`,this.themeClass]},a(Y,{clsPrefix:n,style:t.default?"":this.cssVars,stroke:this.stroke,"stroke-width":this.mergedStrokeWidth,radius:this.radius,scale:this.scale,class:`${n}-spin`}),c);return(o=this.onRender)===null||o===void 0||o.call(this),t.default?a("div",{class:[`${n}-spin-container`,this.themeClass],style:this.cssVars},a("div",{class:[`${n}-spin-content`,this.active&&`${n}-spin-content--spinning`,this.contentClass],style:this.contentStyle},t),a(U,{name:"fade-in-transition"},{default:()=>this.active?m:null})):m}}),O=1.25,xe=s("timeline",`
 position: relative;
 width: 100%;
 display: flex;
 flex-direction: column;
 line-height: ${O};
`,[v("horizontal",`
 flex-direction: row;
 `,[f(">",[s("timeline-item",`
 flex-shrink: 0;
 padding-right: 40px;
 `,[v("dashed-line-type",[f(">",[s("timeline-item-timeline",[u("line",`
 background-image: linear-gradient(90deg, var(--n-color-start), var(--n-color-start) 50%, transparent 50%, transparent 100%);
 background-size: 10px 1px;
 `)])])]),f(">",[s("timeline-item-content",`
 margin-top: calc(var(--n-icon-size) + 12px);
 `,[f(">",[u("meta",`
 margin-top: 6px;
 margin-bottom: unset;
 `)])]),s("timeline-item-timeline",`
 width: 100%;
 height: calc(var(--n-icon-size) + 12px);
 `,[u("line",`
 left: var(--n-icon-size);
 top: calc(var(--n-icon-size) / 2 - 1px);
 right: 0px;
 width: unset;
 height: 2px;
 `)])])])])]),v("right-placement",[s("timeline-item",[s("timeline-item-content",`
 text-align: right;
 margin-right: calc(var(--n-icon-size) + 12px);
 `),s("timeline-item-timeline",`
 width: var(--n-icon-size);
 right: 0;
 `)])]),v("left-placement",[s("timeline-item",[s("timeline-item-content",`
 margin-left: calc(var(--n-icon-size) + 12px);
 `),s("timeline-item-timeline",`
 left: 0;
 `)])]),s("timeline-item",`
 position: relative;
 `,[f("&:last-child",[s("timeline-item-timeline",[u("line",`
 display: none;
 `)]),s("timeline-item-content",[u("meta",`
 margin-bottom: 0;
 `)])]),s("timeline-item-content",[u("title",`
 margin: var(--n-title-margin);
 font-size: var(--n-title-font-size);
 transition: color .3s var(--n-bezier);
 font-weight: var(--n-title-font-weight);
 color: var(--n-title-text-color);
 `),u("content",`
 transition: color .3s var(--n-bezier);
 font-size: var(--n-content-font-size);
 color: var(--n-content-text-color);
 `),u("meta",`
 transition: color .3s var(--n-bezier);
 font-size: 12px;
 margin-top: 6px;
 margin-bottom: 20px;
 color: var(--n-meta-text-color);
 `)]),v("dashed-line-type",[s("timeline-item-timeline",[u("line",`
 --n-color-start: var(--n-line-color);
 transition: --n-color-start .3s var(--n-bezier);
 background-color: transparent;
 background-image: linear-gradient(180deg, var(--n-color-start), var(--n-color-start) 50%, transparent 50%, transparent 100%);
 background-size: 1px 10px;
 `)])]),s("timeline-item-timeline",`
 width: calc(var(--n-icon-size) + 12px);
 position: absolute;
 top: calc(var(--n-title-font-size) * ${O} / 2 - var(--n-icon-size) / 2);
 height: 100%;
 `,[u("circle",`
 border: var(--n-circle-border);
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 width: var(--n-icon-size);
 height: var(--n-icon-size);
 border-radius: var(--n-icon-size);
 box-sizing: border-box;
 `),u("icon",`
 color: var(--n-icon-color);
 font-size: var(--n-icon-size);
 height: var(--n-icon-size);
 width: var(--n-icon-size);
 display: flex;
 align-items: center;
 justify-content: center;
 `),u("line",`
 transition: background-color .3s var(--n-bezier);
 position: absolute;
 top: var(--n-icon-size);
 left: calc(var(--n-icon-size) / 2 - 1px);
 bottom: 0px;
 width: 2px;
 background-color: var(--n-line-color);
 `)])])]),Ce=Object.assign(Object.assign({},S.props),{horizontal:Boolean,itemPlacement:{type:String,default:"left"},size:{type:String,default:"medium"},iconSize:Number}),V=ne("n-timeline"),we=w({name:"Timeline",props:Ce,setup(e,{slots:o}){const{mergedClsPrefixRef:t}=P(e),n=S("Timeline","-timeline",xe,ve,e,t);return ie(V,{props:e,mergedThemeRef:n,mergedClsPrefixRef:t}),()=>{const{value:i}=t;return a("div",{class:[`${i}-timeline`,e.horizontal&&`${i}-timeline--horizontal`,`${i}-timeline--${e.size}-size`,!e.horizontal&&`${i}-timeline--${e.itemPlacement}-placement`]},o)}}}),Se={time:[String,Number],title:String,content:String,color:String,lineType:{type:String,default:"default"},type:{type:String,default:"default"}},$e=w({name:"TimelineItem",props:Se,slots:Object,setup(e){const o=oe(V);o||re("timeline-item","`n-timeline-item` must be placed inside `n-timeline`."),he();const{inlineThemeDisabled:t}=P(),n=y(()=>{const{props:{size:l,iconSize:c},mergedThemeRef:m}=o,{type:r}=e,{self:{titleTextColor:d,contentTextColor:p,metaTextColor:$,lineColor:T,titleFontWeight:k,contentFontSize:B,[z("iconSize",l)]:W,[z("titleMargin",l)]:D,[z("titleFontSize",l)]:E,[z("circleBorder",r)]:F,[z("iconColor",r)]:H},common:{cubicBezierEaseInOut:L}}=m.value;return{"--n-bezier":L,"--n-circle-border":F,"--n-icon-color":H,"--n-content-font-size":B,"--n-content-text-color":p,"--n-line-color":T,"--n-meta-text-color":$,"--n-title-font-size":E,"--n-title-font-weight":k,"--n-title-margin":D,"--n-title-text-color":d,"--n-icon-size":se(c)||W}}),i=t?I("timeline-item",y(()=>{const{props:{size:l,iconSize:c}}=o,{type:m}=e;return`${l[0]}${c||"a"}${m[0]}`}),n,o.props):void 0;return{mergedClsPrefix:o.mergedClsPrefixRef,cssVars:t?void 0:n,themeClass:i?.themeClass,onRender:i?.onRender}},render(){const{mergedClsPrefix:e,color:o,onRender:t,$slots:n}=this;return t?.(),a("div",{class:[`${e}-timeline-item`,this.themeClass,`${e}-timeline-item--${this.type}-type`,`${e}-timeline-item--${this.lineType}-line-type`],style:this.cssVars},a("div",{class:`${e}-timeline-item-timeline`},a("div",{class:`${e}-timeline-item-timeline__line`}),R(n.icon,i=>i?a("div",{class:`${e}-timeline-item-timeline__icon`,style:{color:o}},i):a("div",{class:`${e}-timeline-item-timeline__circle`,style:{borderColor:o}}))),a("div",{class:`${e}-timeline-item-content`},R(n.header,i=>i||this.title?a("div",{class:`${e}-timeline-item-content__title`},i||this.title):null),a("div",{class:`${e}-timeline-item-content__content`},_(n.default,()=>[this.content])),a("div",{class:`${e}-timeline-item-content__meta`},_(n.footer,()=>[this.time]))))}}),Te={key:0,class:"flex justify-center items-center py-8"},Pe=w({__name:"ConversationDetailDrawer",props:{show:{type:Boolean},conversation:{},history:{},loading:{type:Boolean}},emits:["update:show"],setup(e,{emit:o}){const t=e,n=o;function i(c){n("update:show",c)}const l=y(()=>[...t.history].sort((c,m)=>new Date(c.createdAt||"").getTime()-new Date(m.createdAt||"").getTime()));return(c,m)=>(g(),x(h(pe),{show:t.show,width:800,"onUpdate:show":i},{default:b(()=>[C(h(le),{title:e.conversation?`对话详情: ${e.conversation.name}`:"对话详情",closable:""},{default:b(()=>[C(h(be),{show:e.loading},{default:b(()=>[!e.conversation||e.history.length===0?(g(),j("div",Te,[C(h(ae),{description:"无对话记录"})])):(g(),x(h(we),{key:1},{default:b(()=>[(g(!0),j(ce,null,me(l.value,(r,d)=>(g(),x(h($e),{key:r.id,type:r.role==="user"?"info":"success",title:r.role==="user"?"用户":"AI",time:r.createdAt},{default:b(()=>[C(K,{message:r},null,8,["message"]),d<e.history.length-1?(g(),x(h(de),{key:0})):ue("",!0)]),_:2},1032,["type","title","time"]))),128))]),_:1}))]),_:1},8,["show"])]),_:1},8,["title"])]),_:1},8,["show"]))}});export{be as N,Pe as _};
