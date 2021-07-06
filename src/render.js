import { createElement, createTextElement } from "./vdom";

export function renderMixin(Vue) {
  // 创建 render 函数需要的三个方法
  Vue.prototype._c = function(tagName, data, ...children) { // createElement
    const vm = this;

    return createElement(vm, tagName, data, children);
  }

  Vue.prototype._v = function(text) { // createTextElement
    const vm = this;

    return createTextElement(vm, text);
  }

  // 转字符串
  Vue.prototype._s = function(val) {
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  }

  // 把 vm.$options 上的 render 方法 挂载到原型链
  Vue.prototype._render = function() {
    const vm = this;

    // 就是我们通过 ast 生成的 render 方法(或者原本就传了 render 方法)
    let render = vm.$options.render;
    
    let vnode = render.call(vm);
    
    return vnode;
  }
}