import { initGlobalAPI } from './initGlobalAPI';
import { initMixin } from './initMixin'; 
import { lifecycleMixin } from './lifecycle';
import { renderMixin } from './render';
import { stateMixin } from './state';

function Vue(options) {
  this._init(options);
}

// vue 增加静态方法，mixin 之类的
initGlobalAPI(Vue); 

// 在 Vue 原型链上扩展初始化方法(init, $mount 等)
initMixin(Vue);

// 原型链挂载 _render -> 生成虚拟 dom 方法
renderMixin(Vue);

// 原型链挂载 _update -> 生成真实 dom 方法
lifecycleMixin(Vue);

// 扩展原型 $watcher 方法
stateMixin(Vue);

export default Vue;