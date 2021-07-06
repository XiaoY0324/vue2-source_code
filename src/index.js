import { initMixin } from './initMixin'; 
import { lifecycleMixin } from './lifecycle';
import { renderMixin } from './render';

function Vue(options) {
  this._init(options);
}

// 在 Vue 原型链上扩展方法 
initMixin(Vue);

// 原型链挂载 _render -> 生成虚拟 dom 方法
renderMixin(Vue);

// 原型链挂载 _update -> 生成真实 dom 方法
lifecycleMixin(Vue);

export default Vue;