import { patch } from "./vdom/patch";

export function lifecycleMixin(Vue) {
  // 生成真实 dom 的方法
  Vue.prototype._update = function(vdom) {
    const vm = this;
    // console.log(vm.$el, '_updata', vdom);
    // 既有初始化，又有更新

    patch(vm.$el, vdom); // diff 来啦
  }
}

export function mountComponent(vm, el) {
  // 更新函数 数据变化后 会再次调用此函数
  let updataComponent = () => {
    // 调用 render 函数，生成虚拟 dom
    let vdom = vm._render();

    console.log(vdom, '虚拟dom');
    // 用虚拟 dom 生成真实 dom
    vm._update(vdom);
  }

  updataComponent();
}