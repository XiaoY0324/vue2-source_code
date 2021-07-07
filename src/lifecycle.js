import Watcher from "./observer/watcher";
import { nextTick } from "./utils";
import { patch } from "./vdom/patch";

export function lifecycleMixin(Vue) {
  // 生成真实 dom 的方法
  Vue.prototype._update = function(vdom) {
    const vm = this;
    // console.log(vm.$el, '_updata', vdom);
    // 既有初始化，又有更新

    // 老节点被干掉了 使用新节点
    vm.$el = patch(vm.$el, vdom); // diff 来啦
  }

  // nextTick 方法
  Vue.prototype.$nextTick = nextTick;
}

// 后续每个组件渲染的时候都会有一个 watcher
export function mountComponent(vm, el) {
  // 更新函数 数据变化后 会再次调用此函数
  let updataComponent = () => {
    // 调用 render 函数，生成虚拟 dom，用虚拟 dom 生成真实 dom
    vm._update(vm._render());
  }

  // 注掉原有更新逻辑
  // updataComponent();

  // 传入 true 标识着他是一个渲染 watcher，后续还会有其他 watcher，这里做个标识
  new Watcher(vm, updataComponent, () => {
    console.log('更新视图啦');
  }, true); 
}