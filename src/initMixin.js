import { initState } from "./state";

export function initMixin(Vue) {
  // 后续组件化开发的时候，Vue.extend 可以创造一个子组件，子组件也可以调用 _init 方法
  Vue.prototype._init = function(options) {
    const vm = this;
    
    // 注意调用的时候是 实例._init, 所以这里的 this 指的是实例本身 
    // 把用户的配置放到实例上, 这样在其他方法中都可以共享 options 了
    vm.$options = options;

    // 因为数据的来源有很多种，比如 data、props、computed 等，我们要做一个统一的数据的初始化『数据劫持』
    initState(vm);

    if (vm.$options.el) {
      // 要将数据挂载到页面上『模板解析』
      console.log('页面要挂载');

      // 现在数据已经被劫持了，数据变化需要更新视图(diff 算法更新需要更新的部分)
      // 在 vue2 中，使用的是更符合前端思维的 template 而不是更灵活的 JSX
      // vue3 template 写起来性能会高一些，内部做了很多优化，所以在 vue3 里面尽量不要使用 jsx

      // 挂载到的 DOM 节点，其实最终用的都是 $mount 方法
      // 处理 new Vue({ el })  写法
      vm.$mount(vm.$options.el);
    } 
  }

  // 挂载节点的方法(如果 options 中不传 el 的话)
  // 兼容 new Vue({}).$mount(el) 这种写法
  Vue.prototype.$mount = function(el) {
    const vm = this;
    el = document.querySelector(el); // 获取真实节点
  }
}