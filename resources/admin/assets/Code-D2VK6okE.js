import{aM as M,c4 as k,P as f,a8 as W,as as g,a9 as F,at as w,b1 as I,d as O,H as x,ac as q,v as V,L as j,ai as _,af as y,ah as D,j as K}from"./index-DiOlaFw7.js";function U(n,e){const o=M(k,null);return f(()=>n.hljs||o?.mergedHljsRef.value)}function A(n){const{textColor2:e,fontSize:o,fontWeightStrong:c,textColor3:a}=n;return{textColor:e,fontSize:o,fontWeightStrong:c,"mono-3":"#a0a1a7","hue-1":"#0184bb","hue-2":"#4078f2","hue-3":"#a626a4","hue-4":"#50a14f","hue-5":"#e45649","hue-5-2":"#c91243","hue-6":"#986801","hue-6-2":"#c18401",lineNumberTextColor:a}}const G={common:W,self:A},J=g([F("code",`
 font-size: var(--n-font-size);
 font-family: var(--n-font-family);
 `,[w("show-line-numbers",`
 display: flex;
 `),I("line-numbers",`
 user-select: none;
 padding-right: 12px;
 text-align: right;
 transition: color .3s var(--n-bezier);
 color: var(--n-line-number-text-color);
 `),w("word-wrap",[g("pre",`
 white-space: pre-wrap;
 word-break: break-all;
 `)]),g("pre",`
 margin: 0;
 line-height: inherit;
 font-size: inherit;
 font-family: inherit;
 `),g("[class^=hljs]",`
 color: var(--n-text-color);
 transition: 
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `)]),({props:n})=>{const e=`${n.bPrefix}code`;return[`${e} .hljs-comment,
 ${e} .hljs-quote {
 color: var(--n-mono-3);
 font-style: italic;
 }`,`${e} .hljs-doctag,
 ${e} .hljs-keyword,
 ${e} .hljs-formula {
 color: var(--n-hue-3);
 }`,`${e} .hljs-section,
 ${e} .hljs-name,
 ${e} .hljs-selector-tag,
 ${e} .hljs-deletion,
 ${e} .hljs-subst {
 color: var(--n-hue-5);
 }`,`${e} .hljs-literal {
 color: var(--n-hue-1);
 }`,`${e} .hljs-string,
 ${e} .hljs-regexp,
 ${e} .hljs-addition,
 ${e} .hljs-attribute,
 ${e} .hljs-meta-string {
 color: var(--n-hue-4);
 }`,`${e} .hljs-built_in,
 ${e} .hljs-class .hljs-title {
 color: var(--n-hue-6-2);
 }`,`${e} .hljs-attr,
 ${e} .hljs-variable,
 ${e} .hljs-template-variable,
 ${e} .hljs-type,
 ${e} .hljs-selector-class,
 ${e} .hljs-selector-attr,
 ${e} .hljs-selector-pseudo,
 ${e} .hljs-number {
 color: var(--n-hue-6);
 }`,`${e} .hljs-symbol,
 ${e} .hljs-bullet,
 ${e} .hljs-link,
 ${e} .hljs-meta,
 ${e} .hljs-selector-id,
 ${e} .hljs-title {
 color: var(--n-hue-2);
 }`,`${e} .hljs-emphasis {
 font-style: italic;
 }`,`${e} .hljs-strong {
 font-weight: var(--n-font-weight-strong);
 }`,`${e} .hljs-link {
 text-decoration: underline;
 }`]}]),Q=Object.assign(Object.assign({},y.props),{language:String,code:{type:String,default:""},trim:{type:Boolean,default:!0},hljs:Object,uri:Boolean,inline:Boolean,wordWrap:Boolean,showLineNumbers:Boolean,internalFontSize:Number,internalNoHighlight:Boolean}),Y=O({name:"Code",props:Q,setup(n,{slots:e}){const{internalNoHighlight:o}=n,{mergedClsPrefixRef:c,inlineThemeDisabled:a}=q(),h=K(null),b=o?{value:void 0}:U(n),N=(t,r,l)=>{const{value:s}=b;return!s||!(t&&s.getLanguage(t))?null:s.highlight(l?r.trim():r,{language:t}).value},z=f(()=>n.inline||n.wordWrap?!1:n.showLineNumbers),m=()=>{if(e.default)return;const{value:t}=h;if(!t)return;const{language:r}=n,l=n.uri?window.decodeURIComponent(n.code):n.code;if(r){const i=N(r,l,n.trim);if(i!==null){if(n.inline)t.innerHTML=i;else{const $=t.querySelector(".__code__");$&&t.removeChild($);const d=document.createElement("pre");d.className="__code__",d.innerHTML=i,t.appendChild(d)}return}}if(n.inline){t.textContent=l;return}const s=t.querySelector(".__code__");if(s)s.textContent=l;else{const i=document.createElement("pre");i.className="__code__",i.textContent=l,t.innerHTML="",t.appendChild(i)}};V(m),j(_(n,"language"),m),j(_(n,"code"),m),o||j(b,m);const R=y("Code","-code",J,G,n,c),v=f(()=>{const{common:{cubicBezierEaseInOut:t,fontFamilyMono:r},self:{textColor:l,fontSize:s,fontWeightStrong:i,lineNumberTextColor:$,"mono-3":d,"hue-1":S,"hue-2":L,"hue-3":H,"hue-4":P,"hue-5":p,"hue-5-2":B,"hue-6":E,"hue-6-2":T}}=R.value,{internalFontSize:C}=n;return{"--n-font-size":C?`${C}px`:s,"--n-font-family":r,"--n-font-weight-strong":i,"--n-bezier":t,"--n-text-color":l,"--n-mono-3":d,"--n-hue-1":S,"--n-hue-2":L,"--n-hue-3":H,"--n-hue-4":P,"--n-hue-5":p,"--n-hue-5-2":B,"--n-hue-6":E,"--n-hue-6-2":T,"--n-line-number-text-color":$}}),u=a?D("code",f(()=>`${n.internalFontSize||"a"}`),v,n):void 0;return{mergedClsPrefix:c,codeRef:h,mergedShowLineNumbers:z,lineNumbers:f(()=>{let t=1;const r=[];let l=!1;for(const s of n.code)s===`
`?(l=!0,r.push(t++)):l=!1;return l||r.push(t++),r.join(`
`)}),cssVars:a?void 0:v,themeClass:u?.themeClass,onRender:u?.onRender}},render(){var n,e;const{mergedClsPrefix:o,wordWrap:c,mergedShowLineNumbers:a,onRender:h}=this;return h?.(),x("code",{class:[`${o}-code`,this.themeClass,c&&`${o}-code--word-wrap`,a&&`${o}-code--show-line-numbers`],style:this.cssVars,ref:"codeRef"},a?x("pre",{class:`${o}-code__line-numbers`},this.lineNumbers):null,(e=(n=this.$slots).default)===null||e===void 0?void 0:e.call(n))}});export{Y as N};
