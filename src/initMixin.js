
import { compileToFunctions } from "./compiler";
import { mountComponent } from "./lifecycle";
import { initState } from "./state";
import { mergeOptions } from "./utils";

function callHook(vm, hook) {
  const handlers = vm.$options[hook];

  if (handlers) {
    // 依次执行生命周期收集的钩子函数
    for (let i = 0; i < handlers.length; i++) {
      // 生命周期的 this 也指向当前实例，这就是为什么 vue2 中生命周期能拿到当前组件实例
      handlers[i].call(vm); 
    }
  } 
}

export function initMixin(Vue) {
  // 后续组件化开发的时候，Vue.extend 可以创造一个子组件，子组件也可以调用 _init 方法
  Vue.prototype._init = function(options) {
    const vm = this;
    
    // 注意调用的时候是 实例._init, 所以这里的 this 指的是实例本身 
    // 把用户的配置放到实例上, 这样在其他方法中都可以共享 options 了
    // 同混入的 Vue.options 做合并(mixin), 注意参数顺序，组件 options 优先替换 全局 options
    vm.$options = mergeOptions(this.constructor.options, options);
    // console.warn(vm.$options);

    callHook(vm, 'beforeCreate'); // beforeCreate 在 initState 前执行

    // 因为数据的来源有很多种，比如 data、props、computed 等，我们要做一个统一的数据的初始化『数据劫持』
    initState(vm);

    if (vm.$options.el) {
      // 要将数据挂载到页面上『模板解析』
      // console.log('页面要挂载');

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
    const opts = vm.$options;

    el = document.querySelector(el); // 获取真实节点
    vm.$el = el; // 真实元素挂载到实例上

    if (!opts.render) {
      // 模板编译
      let template = opts.template;

      if (!template && el) {
        // outerHTML 取得是该元素和其所有子元素序列化后的字符串标签
        template = el.outerHTML;
      }

      // compileToFunctions 为模板编译的方法，模板 -> js 对象 -> ast -> render code -> 生成 render 函数
      let render = compileToFunctions(template); // el 节点本身

      opts.render = render;
    }

    // opts.render 就是渲染函数
    // console.warn(opts.render, 'opts.render');

    // 开始组件挂载流程(生命周期方法)，也就是模板解析(变量渲染到dom上)
    mountComponent(vm, el);
  }
}