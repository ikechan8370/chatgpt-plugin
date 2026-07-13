import{a9 as p,at as a,d as $,H as i,ac as z,af as h,ah as B,bY as T,P as c,az as R,av as S}from"./index-DiOlaFw7.js";const P=p("text",`
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
`,[a("strong",`
 font-weight: var(--n-font-weight-strong);
 `),a("italic",{fontStyle:"italic"}),a("underline",{textDecoration:"underline"}),a("code",`
 line-height: 1.4;
 display: inline-block;
 font-family: var(--n-font-famliy-mono);
 transition: 
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 box-sizing: border-box;
 padding: .05em .35em 0 .35em;
 border-radius: var(--n-code-border-radius);
 font-size: .9em;
 color: var(--n-code-text-color);
 background-color: var(--n-code-color);
 border: var(--n-code-border);
 `)]),V=Object.assign(Object.assign({},h.props),{code:Boolean,type:{type:String,default:"default"},delete:Boolean,strong:Boolean,italic:Boolean,underline:Boolean,depth:[String,Number],tag:String,as:{type:String,validator:()=>!0,default:void 0}}),w=$({name:"Text",props:V,setup(e){const{mergedClsPrefixRef:r,inlineThemeDisabled:s}=z(e),o=h("Typography","-text",P,R,e,r),n=c(()=>{const{depth:l,type:d}=e,u=d==="default"?l===void 0?"textColor":`textColor${l}Depth`:S("textColor",d),{common:{fontWeightStrong:g,fontFamilyMono:m,cubicBezierEaseInOut:x},self:{codeTextColor:f,codeBorderRadius:b,codeColor:v,codeBorder:y,[u]:C}}=o.value;return{"--n-bezier":x,"--n-text-color":C,"--n-font-weight-strong":g,"--n-font-famliy-mono":m,"--n-code-border-radius":b,"--n-code-text-color":f,"--n-code-color":v,"--n-code-border":y}}),t=s?B("text",c(()=>`${e.type[0]}${e.depth||""}`),n,e):void 0;return{mergedClsPrefix:r,compitableTag:T(e,["as","tag"]),cssVars:s?void 0:n,themeClass:t?.themeClass,onRender:t?.onRender}},render(){var e,r,s;const{mergedClsPrefix:o}=this;(e=this.onRender)===null||e===void 0||e.call(this);const n=[`${o}-text`,this.themeClass,{[`${o}-text--code`]:this.code,[`${o}-text--delete`]:this.delete,[`${o}-text--strong`]:this.strong,[`${o}-text--italic`]:this.italic,[`${o}-text--underline`]:this.underline}],t=(s=(r=this.$slots).default)===null||s===void 0?void 0:s.call(r);return this.code?i("code",{class:n,style:this.cssVars},this.delete?i("del",null,t):t):this.delete?i("del",{class:n,style:this.cssVars},t):i(this.compitableTag||"span",{class:n,style:this.cssVars},t)}});export{w as N};
