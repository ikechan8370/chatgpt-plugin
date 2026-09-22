import{aa as w,aq as d,ar as h,d as z,H as $,ad as T,ag as f,ai as H,P as c,as as P,at as n}from"./index-BWDkVURg.js";const R=w("h",`
 font-size: var(--n-font-size);
 font-weight: var(--n-font-weight);
 margin: var(--n-margin);
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
`,[d("&:first-child",{marginTop:0}),h("prefix-bar",{position:"relative",paddingLeft:"var(--n-prefix-width)"},[h("align-text",{paddingLeft:0},[d("&::before",{left:"calc(-1 * var(--n-prefix-width))"})]),d("&::before",`
 content: "";
 width: var(--n-bar-width);
 border-radius: calc(var(--n-bar-width) / 2);
 transition: background-color .3s var(--n-bezier);
 left: 0;
 top: 0;
 bottom: 0;
 position: absolute;
 `),d("&::before",{backgroundColor:"var(--n-bar-color)"})])]),B=Object.assign(Object.assign({},f.props),{type:{type:String,default:"default"},prefix:String,alignText:Boolean}),l=r=>z({name:`H${r}`,props:B,setup(e){const{mergedClsPrefixRef:i,inlineThemeDisabled:o}=T(e),t=f("Typography","-h",R,P,e,i),s=c(()=>{const{type:g}=e,{common:{cubicBezierEaseInOut:b},self:{headerFontWeight:m,headerTextColor:p,[n("headerPrefixWidth",r)]:u,[n("headerFontSize",r)]:x,[n("headerMargin",r)]:C,[n("headerBarWidth",r)]:v,[n("headerBarColor",g)]:y}}=t.value;return{"--n-bezier":b,"--n-font-size":x,"--n-margin":C,"--n-bar-color":y,"--n-bar-width":v,"--n-font-weight":m,"--n-text-color":p,"--n-prefix-width":u}}),a=o?H(`h${r}`,c(()=>e.type[0]),s,e):void 0;return{mergedClsPrefix:i,cssVars:o?void 0:s,themeClass:a?.themeClass,onRender:a?.onRender}},render(){var e;const{prefix:i,alignText:o,mergedClsPrefix:t,cssVars:s,$slots:a}=this;return(e=this.onRender)===null||e===void 0||e.call(this),$(`h${r}`,{class:[`${t}-h`,`${t}-h${r}`,this.themeClass,{[`${t}-h--prefix-bar`]:i,[`${t}-h--align-text`]:o}],style:s},a)}}),S=l("2"),L=l("3");export{L as N,S as a};
