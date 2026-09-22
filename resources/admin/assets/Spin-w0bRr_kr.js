import{aq as f,aa as c,ci as C,ar as h,d as S,H as o,c1 as x,T,ad as $,ag as v,cs as k,ai as w,P as m,b3 as R,bL as j,at as O,bZ as P,j as B,ct as N}from"./index-BWDkVURg.js";const V=f([f("@keyframes spin-rotate",`
 from {
 transform: rotate(0);
 }
 to {
 transform: rotate(360deg);
 }
 `),c("spin-container",`
 position: relative;
 `,[c("spin-body",`
 position: absolute;
 top: 50%;
 left: 50%;
 transform: translateX(-50%) translateY(-50%);
 `,[C()])]),c("spin-body",`
 display: inline-flex;
 align-items: center;
 justify-content: center;
 flex-direction: column;
 `),c("spin",`
 display: inline-flex;
 height: var(--n-size);
 width: var(--n-size);
 font-size: var(--n-size);
 color: var(--n-color);
 `,[h("rotate",`
 animation: spin-rotate 2s linear infinite;
 `)]),c("spin-description",`
 display: inline-block;
 font-size: var(--n-font-size);
 color: var(--n-text-color);
 transition: color .3s var(--n-bezier);
 margin-top: 8px;
 `),c("spin-content",`
 opacity: 1;
 transition: opacity .3s var(--n-bezier);
 pointer-events: all;
 `,[h("spinning",`
 user-select: none;
 -webkit-user-select: none;
 pointer-events: none;
 opacity: var(--n-opacity-spinning);
 `)])]),I={small:20,medium:18,large:16},L=Object.assign(Object.assign(Object.assign({},v.props),{contentClass:String,contentStyle:[Object,String],description:String,size:{type:[String,Number],default:"medium"},show:{type:Boolean,default:!0},rotate:{type:Boolean,default:!0},spinning:{type:Boolean,validator:()=>!0,default:void 0},delay:Number}),N),E=S({name:"Spin",props:L,slots:Object,setup(e){const{mergedClsPrefixRef:r,inlineThemeDisabled:t}=$(e),s=v("Spin","-spin",V,k,e,r),d=m(()=>{const{size:n}=e,{common:{cubicBezierEaseInOut:a},self:u}=s.value,{opacitySpinning:y,color:g,textColor:b}=u,z=typeof n=="number"?j(n):u[O("size",n)];return{"--n-bezier":a,"--n-opacity-spinning":y,"--n-size":z,"--n-color":g,"--n-text-color":b}}),i=t?w("spin",m(()=>{const{size:n}=e;return typeof n=="number"?String(n):n[0]}),d,e):void 0,p=P(e,["spinning","show"]),l=B(!1);return R(n=>{let a;if(p.value){const{delay:u}=e;if(u){a=window.setTimeout(()=>{l.value=!0},u),n(()=>{clearTimeout(a)});return}}l.value=p.value}),{mergedClsPrefix:r,active:l,mergedStrokeWidth:m(()=>{const{strokeWidth:n}=e;if(n!==void 0)return n;const{size:a}=e;return I[typeof a=="number"?"medium":a]}),cssVars:t?void 0:d,themeClass:i?.themeClass,onRender:i?.onRender}},render(){var e,r;const{$slots:t,mergedClsPrefix:s,description:d}=this,i=t.icon&&this.rotate,p=(d||t.description)&&o("div",{class:`${s}-spin-description`},d||((e=t.description)===null||e===void 0?void 0:e.call(t))),l=t.icon?o("div",{class:[`${s}-spin-body`,this.themeClass]},o("div",{class:[`${s}-spin`,i&&`${s}-spin--rotate`],style:t.default?"":this.cssVars},t.icon()),p):o("div",{class:[`${s}-spin-body`,this.themeClass]},o(x,{clsPrefix:s,style:t.default?"":this.cssVars,stroke:this.stroke,"stroke-width":this.mergedStrokeWidth,radius:this.radius,scale:this.scale,class:`${s}-spin`}),p);return(r=this.onRender)===null||r===void 0||r.call(this),t.default?o("div",{class:[`${s}-spin-container`,this.themeClass],style:this.cssVars},o("div",{class:[`${s}-spin-content`,this.active&&`${s}-spin-content--spinning`,this.contentClass],style:this.contentStyle},t),o(T,{name:"fade-in-transition"},{default:()=>this.active?l:null})):l}});export{E as N};
