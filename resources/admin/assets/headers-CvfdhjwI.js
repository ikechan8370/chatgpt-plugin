import{a9 as w,as as d,at as h,d as z,H as $,ac as T,af as f,ah as H,P as c,az as P,av as n}from"./index-DiOlaFw7.js";const R=w("h",`
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
 `),d("&::before",{backgroundColor:"var(--n-bar-color)"})])]),B=Object.assign(Object.assign({},f.props),{type:{type:String,default:"default"},prefix:String,alignText:Boolean}),l=r=>z({name:`H${r}`,props:B,setup(e){const{mergedClsPrefixRef:i,inlineThemeDisabled:o}=T(e),a=f("Typography","-h",R,P,e,i),s=c(()=>{const{type:g}=e,{common:{cubicBezierEaseInOut:b},self:{headerFontWeight:m,headerTextColor:p,[n("headerPrefixWidth",r)]:u,[n("headerFontSize",r)]:x,[n("headerMargin",r)]:v,[n("headerBarWidth",r)]:C,[n("headerBarColor",g)]:y}}=a.value;return{"--n-bezier":b,"--n-font-size":x,"--n-margin":v,"--n-bar-color":y,"--n-bar-width":C,"--n-font-weight":m,"--n-text-color":p,"--n-prefix-width":u}}),t=o?H(`h${r}`,c(()=>e.type[0]),s,e):void 0;return{mergedClsPrefix:i,cssVars:o?void 0:s,themeClass:t?.themeClass,onRender:t?.onRender}},render(){var e;const{prefix:i,alignText:o,mergedClsPrefix:a,cssVars:s,$slots:t}=this;return(e=this.onRender)===null||e===void 0||e.call(this),$(`h${r}`,{class:[`${a}-h`,`${a}-h${r}`,this.themeClass,{[`${a}-h--prefix-bar`]:i,[`${a}-h--align-text`]:o}],style:s},t)}}),S=l("2"),L=l("3");export{L as N,S as a};
