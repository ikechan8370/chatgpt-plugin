import{a8 as F,by as M,br as u,bz as b,a9 as I,b1 as i,at as T,bA as V,as as N,d as D,H as t,bB as q,bt as K,a_ as Q,aa as G,ap as J,ao as U,an as X,aq as Y,aQ as Z,bC as oo,ac as eo,af as $,bi as ro,ah as no,P as R,bD as so,av as c,j as to}from"./index-DiOlaFw7.js";function lo(r){const{lineHeight:o,borderRadius:d,fontWeightStrong:f,baseColor:l,dividerColor:v,actionColor:y,textColor1:g,textColor2:s,closeColorHover:h,closeColorPressed:C,closeIconColor:p,closeIconColorHover:m,closeIconColorPressed:n,infoColor:e,successColor:x,warningColor:z,errorColor:P,fontSize:S}=r;return Object.assign(Object.assign({},M),{fontSize:S,lineHeight:o,titleFontWeight:f,borderRadius:d,border:`1px solid ${v}`,color:y,titleTextColor:g,iconColor:s,contentTextColor:s,closeBorderRadius:d,closeColorHover:h,closeColorPressed:C,closeIconColor:p,closeIconColorHover:m,closeIconColorPressed:n,borderInfo:`1px solid ${u(l,b(e,{alpha:.25}))}`,colorInfo:u(l,b(e,{alpha:.08})),titleTextColorInfo:g,iconColorInfo:e,contentTextColorInfo:s,closeColorHoverInfo:h,closeColorPressedInfo:C,closeIconColorInfo:p,closeIconColorHoverInfo:m,closeIconColorPressedInfo:n,borderSuccess:`1px solid ${u(l,b(x,{alpha:.25}))}`,colorSuccess:u(l,b(x,{alpha:.08})),titleTextColorSuccess:g,iconColorSuccess:x,contentTextColorSuccess:s,closeColorHoverSuccess:h,closeColorPressedSuccess:C,closeIconColorSuccess:p,closeIconColorHoverSuccess:m,closeIconColorPressedSuccess:n,borderWarning:`1px solid ${u(l,b(z,{alpha:.33}))}`,colorWarning:u(l,b(z,{alpha:.08})),titleTextColorWarning:g,iconColorWarning:z,contentTextColorWarning:s,closeColorHoverWarning:h,closeColorPressedWarning:C,closeIconColorWarning:p,closeIconColorHoverWarning:m,closeIconColorPressedWarning:n,borderError:`1px solid ${u(l,b(P,{alpha:.25}))}`,colorError:u(l,b(P,{alpha:.08})),titleTextColorError:g,iconColorError:P,contentTextColorError:s,closeColorHoverError:h,closeColorPressedError:C,closeIconColorError:p,closeIconColorHoverError:m,closeIconColorPressedError:n})}const io={common:F,self:lo},ao=I("alert",`
 line-height: var(--n-line-height);
 border-radius: var(--n-border-radius);
 position: relative;
 transition: background-color .3s var(--n-bezier);
 background-color: var(--n-color);
 text-align: start;
 word-break: break-word;
`,[i("border",`
 border-radius: inherit;
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 transition: border-color .3s var(--n-bezier);
 border: var(--n-border);
 pointer-events: none;
 `),T("closable",[I("alert-body",[i("title",`
 padding-right: 24px;
 `)])]),i("icon",{color:"var(--n-icon-color)"}),I("alert-body",{padding:"var(--n-padding)"},[i("title",{color:"var(--n-title-text-color)"}),i("content",{color:"var(--n-content-text-color)"})]),V({originalTransition:"transform .3s var(--n-bezier)",enterToProps:{transform:"scale(1)"},leaveToProps:{transform:"scale(0.9)"}}),i("icon",`
 position: absolute;
 left: 0;
 top: 0;
 align-items: center;
 justify-content: center;
 display: flex;
 width: var(--n-icon-size);
 height: var(--n-icon-size);
 font-size: var(--n-icon-size);
 margin: var(--n-icon-margin);
 `),i("close",`
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 position: absolute;
 right: 0;
 top: 0;
 margin: var(--n-close-margin);
 `),T("show-icon",[I("alert-body",{paddingLeft:"calc(var(--n-icon-margin-left) + var(--n-icon-size) + var(--n-icon-margin-right))"})]),T("right-adjust",[I("alert-body",{paddingRight:"calc(var(--n-close-size) + var(--n-padding) + 2px)"})]),I("alert-body",`
 border-radius: var(--n-border-radius);
 transition: border-color .3s var(--n-bezier);
 `,[i("title",`
 transition: color .3s var(--n-bezier);
 font-size: 16px;
 line-height: 19px;
 font-weight: var(--n-title-font-weight);
 `,[N("& +",[i("content",{marginTop:"9px"})])]),i("content",{transition:"color .3s var(--n-bezier)",fontSize:"var(--n-font-size)"})]),i("icon",{transition:"color .3s var(--n-bezier)"})]),co=Object.assign(Object.assign({},$.props),{title:String,showIcon:{type:Boolean,default:!0},type:{type:String,default:"default"},bordered:{type:Boolean,default:!0},closable:Boolean,onClose:Function,onAfterLeave:Function,onAfterHide:Function}),ho=D({name:"Alert",inheritAttrs:!1,props:co,slots:Object,setup(r){const{mergedClsPrefixRef:o,mergedBorderedRef:d,inlineThemeDisabled:f,mergedRtlRef:l}=eo(r),v=$("Alert","-alert",ao,io,r,o),y=ro("Alert",l,o),g=R(()=>{const{common:{cubicBezierEaseInOut:n},self:e}=v.value,{fontSize:x,borderRadius:z,titleFontWeight:P,lineHeight:S,iconSize:E,iconMargin:H,iconMarginRtl:_,closeIconSize:W,closeBorderRadius:w,closeSize:A,closeMargin:B,closeMarginRtl:j,padding:k}=e,{type:a}=r,{left:L,right:O}=so(H);return{"--n-bezier":n,"--n-color":e[c("color",a)],"--n-close-icon-size":W,"--n-close-border-radius":w,"--n-close-color-hover":e[c("closeColorHover",a)],"--n-close-color-pressed":e[c("closeColorPressed",a)],"--n-close-icon-color":e[c("closeIconColor",a)],"--n-close-icon-color-hover":e[c("closeIconColorHover",a)],"--n-close-icon-color-pressed":e[c("closeIconColorPressed",a)],"--n-icon-color":e[c("iconColor",a)],"--n-border":e[c("border",a)],"--n-title-text-color":e[c("titleTextColor",a)],"--n-content-text-color":e[c("contentTextColor",a)],"--n-line-height":S,"--n-border-radius":z,"--n-font-size":x,"--n-title-font-weight":P,"--n-icon-size":E,"--n-icon-margin":H,"--n-icon-margin-rtl":_,"--n-close-size":A,"--n-close-margin":B,"--n-close-margin-rtl":j,"--n-padding":k,"--n-icon-margin-left":L,"--n-icon-margin-right":O}}),s=f?no("alert",R(()=>r.type[0]),g,r):void 0,h=to(!0),C=()=>{const{onAfterLeave:n,onAfterHide:e}=r;n&&n(),e&&e()};return{rtlEnabled:y,mergedClsPrefix:o,mergedBordered:d,visible:h,handleCloseClick:()=>{var n;Promise.resolve((n=r.onClose)===null||n===void 0?void 0:n.call(r)).then(e=>{e!==!1&&(h.value=!1)})},handleAfterLeave:()=>{C()},mergedTheme:v,cssVars:f?void 0:g,themeClass:s?.themeClass,onRender:s?.onRender}},render(){var r;return(r=this.onRender)===null||r===void 0||r.call(this),t(oo,{onAfterLeave:this.handleAfterLeave},{default:()=>{const{mergedClsPrefix:o,$slots:d}=this,f={class:[`${o}-alert`,this.themeClass,this.closable&&`${o}-alert--closable`,this.showIcon&&`${o}-alert--show-icon`,!this.title&&this.closable&&`${o}-alert--right-adjust`,this.rtlEnabled&&`${o}-alert--rtl`],style:this.cssVars,role:"alert"};return this.visible?t("div",Object.assign({},q(this.$attrs,f)),this.closable&&t(K,{clsPrefix:o,class:`${o}-alert__close`,onClick:this.handleCloseClick}),this.bordered&&t("div",{class:`${o}-alert__border`}),this.showIcon&&t("div",{class:`${o}-alert__icon`,"aria-hidden":"true"},Q(d.icon,()=>[t(G,{clsPrefix:o},{default:()=>{switch(this.type){case"success":return t(Y,null);case"info":return t(X,null);case"warning":return t(U,null);case"error":return t(J,null);default:return null}}})])),t("div",{class:[`${o}-alert-body`,this.mergedBordered&&`${o}-alert-body--bordered`]},Z(d.header,l=>{const v=l||this.title;return v?t("div",{class:`${o}-alert-body__title`},v):null}),d.default&&t("div",{class:`${o}-alert-body__content`},d))):null}})}});export{ho as _};
