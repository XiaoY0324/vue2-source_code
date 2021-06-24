import { initMixin } from './initMixin'; 

function Vue(options) {
  this._init(options);
}

// 在 Vue 原型链上扩展方法 
initMixin(Vue);

export default Vue;