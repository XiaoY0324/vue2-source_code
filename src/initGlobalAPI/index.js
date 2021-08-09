import { mergeOptions } from "../utils";

// 为 Vue 增加静态方法
export function initGlobalAPI(Vue) {
  Vue.options = {}; // 所有的全局属性都会放到这个变量上

  Vue.mixin = function(mixinOptions) {
    // this 代表 Vue，静态属性 Vue.options
    this.options = mergeOptions(this.options, mixinOptions);
  }
}

