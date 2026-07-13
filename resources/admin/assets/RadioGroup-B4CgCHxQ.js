import{aM as ee,ac as $,ae as A,j as k,ag as G,bu as U,aL as oe,ai as T,ak as w,a9 as V,b1 as g,at as C,as as _,b2 as P,d as te,bg as re,bh as ne,H as j,af as H,bZ as ae,b5 as ie,bi as de,ah as se,P as E,av as D}from"./index-DiOlaFw7.js";const ve={name:String,value:{type:[String,Number,Boolean],default:"on"},checked:{type:Boolean,default:void 0},defaultChecked:Boolean,disabled:{type:Boolean,default:void 0},label:String,size:String,onUpdateChecked:[Function,Array],"onUpdate:checked":[Function,Array],checkedValue:{type:Boolean,default:void 0}},N=oe("n-radio-group");function fe(e){const o=ee(N,null),{mergedClsPrefixRef:n,mergedComponentPropsRef:d}=$(e),i=A(e,{mergedSize(t){var r,a;const{size:v}=e;if(v!==void 0)return v;if(o){const{mergedSizeRef:{value:I}}=o;if(I!==void 0)return I}if(t)return t.mergedSize.value;const F=(a=(r=d?.value)===null||r===void 0?void 0:r.Radio)===null||a===void 0?void 0:a.size;return F||"medium"},mergedDisabled(t){return!!(e.disabled||o?.disabledRef.value||t?.disabled.value)}}),{mergedSizeRef:f,mergedDisabledRef:s}=i,l=k(null),u=k(null),h=k(e.defaultChecked),p=T(e,"checked"),m=G(p,h),c=U(()=>o?o.valueRef.value===e.value:m.value),R=U(()=>{const{name:t}=e;if(t!==void 0)return t;if(o)return o.nameRef.value}),b=k(!1);function z(){if(o){const{doUpdateValue:t}=o,{value:r}=e;w(t,r)}else{const{onUpdateChecked:t,"onUpdate:checked":r}=e,{nTriggerFormInput:a,nTriggerFormChange:v}=i;t&&w(t,!0),r&&w(r,!0),a(),v(),h.value=!0}}function y(){s.value||c.value||z()}function S(){y(),l.value&&(l.value.checked=c.value)}function B(){b.value=!1}function x(){b.value=!0}return{mergedClsPrefix:o?o.mergedClsPrefixRef:n,inputRef:l,labelRef:u,mergedName:R,mergedDisabled:s,renderSafeChecked:c,focus:b,mergedSize:f,handleRadioInputChange:S,handleRadioInputBlur:B,handleRadioInputFocus:x}}const le=V("radio-group",`
 display: inline-block;
 font-size: var(--n-font-size);
`,[g("splitor",`
 display: inline-block;
 vertical-align: bottom;
 width: 1px;
 transition:
 background-color .3s var(--n-bezier),
 opacity .3s var(--n-bezier);
 background: var(--n-button-border-color);
 `,[C("checked",{backgroundColor:"var(--n-button-border-color-active)"}),C("disabled",{opacity:"var(--n-opacity-disabled)"})]),C("button-group",`
 white-space: nowrap;
 height: var(--n-height);
 line-height: var(--n-height);
 `,[V("radio-button",{height:"var(--n-height)",lineHeight:"var(--n-height)"}),g("splitor",{height:"var(--n-height)"})]),V("radio-button",`
 vertical-align: bottom;
 outline: none;
 position: relative;
 user-select: none;
 -webkit-user-select: none;
 display: inline-block;
 box-sizing: border-box;
 padding-left: 14px;
 padding-right: 14px;
 white-space: nowrap;
 transition:
 background-color .3s var(--n-bezier),
 opacity .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 background: var(--n-button-color);
 color: var(--n-button-text-color);
 border-top: 1px solid var(--n-button-border-color);
 border-bottom: 1px solid var(--n-button-border-color);
 `,[V("radio-input",`
 pointer-events: none;
 position: absolute;
 border: 0;
 border-radius: inherit;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 opacity: 0;
 z-index: 1;
 `),g("state-border",`
 z-index: 1;
 pointer-events: none;
 position: absolute;
 box-shadow: var(--n-button-box-shadow);
 transition: box-shadow .3s var(--n-bezier);
 left: -1px;
 bottom: -1px;
 right: -1px;
 top: -1px;
 `),_("&:first-child",`
 border-top-left-radius: var(--n-button-border-radius);
 border-bottom-left-radius: var(--n-button-border-radius);
 border-left: 1px solid var(--n-button-border-color);
 `,[g("state-border",`
 border-top-left-radius: var(--n-button-border-radius);
 border-bottom-left-radius: var(--n-button-border-radius);
 `)]),_("&:last-child",`
 border-top-right-radius: var(--n-button-border-radius);
 border-bottom-right-radius: var(--n-button-border-radius);
 border-right: 1px solid var(--n-button-border-color);
 `,[g("state-border",`
 border-top-right-radius: var(--n-button-border-radius);
 border-bottom-right-radius: var(--n-button-border-radius);
 `)]),P("disabled",`
 cursor: pointer;
 `,[_("&:hover",[g("state-border",`
 transition: box-shadow .3s var(--n-bezier);
 box-shadow: var(--n-button-box-shadow-hover);
 `),P("checked",{color:"var(--n-button-text-color-hover)"})]),C("focus",[_("&:not(:active)",[g("state-border",{boxShadow:"var(--n-button-box-shadow-focus)"})])])]),C("checked",`
 background: var(--n-button-color-active);
 color: var(--n-button-text-color-active);
 border-color: var(--n-button-border-color-active);
 `),C("disabled",`
 cursor: not-allowed;
 opacity: var(--n-opacity-disabled);
 `)])]);function ue(e,o,n){var d;const i=[];let f=!1;for(let s=0;s<e.length;++s){const l=e[s],u=(d=l.type)===null||d===void 0?void 0:d.name;u==="RadioButton"&&(f=!0);const h=l.props;if(u!=="RadioButton"){i.push(l);continue}if(s===0)i.push(l);else{const p=i[i.length-1].props,m=o===p.value,c=p.disabled,R=o===h.value,b=h.disabled,z=(m?2:0)+(c?0:1),y=(R?2:0)+(b?0:1),S={[`${n}-radio-group__splitor--disabled`]:c,[`${n}-radio-group__splitor--checked`]:m},B={[`${n}-radio-group__splitor--disabled`]:b,[`${n}-radio-group__splitor--checked`]:R},x=z<y?B:S;i.push(j("div",{class:[`${n}-radio-group__splitor`,x]}),l)}}return{children:i,isButtonGroup:f}}const ce=Object.assign(Object.assign({},H.props),{name:String,value:[String,Number,Boolean],defaultValue:{type:[String,Number,Boolean],default:null},size:String,disabled:{type:Boolean,default:void 0},"onUpdate:value":[Function,Array],onUpdateValue:[Function,Array]}),he=te({name:"RadioGroup",props:ce,setup(e){const o=k(null),{mergedSizeRef:n,mergedDisabledRef:d,nTriggerFormChange:i,nTriggerFormInput:f,nTriggerFormBlur:s,nTriggerFormFocus:l}=A(e),{mergedClsPrefixRef:u,inlineThemeDisabled:h,mergedRtlRef:p}=$(e),m=H("Radio","-radio-group",le,ae,e,u),c=k(e.defaultValue),R=T(e,"value"),b=G(R,c);function z(r){const{onUpdateValue:a,"onUpdate:value":v}=e;a&&w(a,r),v&&w(v,r),c.value=r,i(),f()}function y(r){const{value:a}=o;a&&(a.contains(r.relatedTarget)||l())}function S(r){const{value:a}=o;a&&(a.contains(r.relatedTarget)||s())}ie(N,{mergedClsPrefixRef:u,nameRef:T(e,"name"),valueRef:b,disabledRef:d,mergedSizeRef:n,doUpdateValue:z});const B=de("Radio",p,u),x=E(()=>{const{value:r}=n,{common:{cubicBezierEaseInOut:a},self:{buttonBorderColor:v,buttonBorderColorActive:F,buttonBorderRadius:I,buttonBoxShadow:M,buttonBoxShadowFocus:K,buttonBoxShadowHover:O,buttonColor:L,buttonColorActive:Z,buttonTextColor:q,buttonTextColorActive:J,buttonTextColorHover:Q,opacityDisabled:W,[D("buttonHeight",r)]:X,[D("fontSize",r)]:Y}}=m.value;return{"--n-font-size":Y,"--n-bezier":a,"--n-button-border-color":v,"--n-button-border-color-active":F,"--n-button-border-radius":I,"--n-button-box-shadow":M,"--n-button-box-shadow-focus":K,"--n-button-box-shadow-hover":O,"--n-button-color":L,"--n-button-color-active":Z,"--n-button-text-color":q,"--n-button-text-color-hover":Q,"--n-button-text-color-active":J,"--n-height":X,"--n-opacity-disabled":W}}),t=h?se("radio-group",E(()=>n.value[0]),x,e):void 0;return{selfElRef:o,rtlEnabled:B,mergedClsPrefix:u,mergedValue:b,handleFocusout:S,handleFocusin:y,cssVars:h?void 0:x,themeClass:t?.themeClass,onRender:t?.onRender}},render(){var e;const{mergedValue:o,mergedClsPrefix:n,handleFocusin:d,handleFocusout:i}=this,{children:f,isButtonGroup:s}=ue(re(ne(this)),o,n);return(e=this.onRender)===null||e===void 0||e.call(this),j("div",{onFocusin:d,onFocusout:i,ref:"selfElRef",class:[`${n}-radio-group`,this.rtlEnabled&&`${n}-radio-group--rtl`,this.themeClass,s&&`${n}-radio-group--button-group`],style:this.cssVars},f)}});export{he as N,ve as r,fe as s};
