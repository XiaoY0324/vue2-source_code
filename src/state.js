import { observe } from "./observer";
import Watcher from "./observer/watcher";
import { isFunction } from "./utils";

// 统一的数据的初始化分发
export function initState(vm) {
  const options = vm.$options;

  if (options.data) {
    initData(vm);
  }

  if (options.watch) {
    initWatch(vm, options.watch);
  }
}

// 代理 -> 使用 vm.info 取到 vm.data.info「劫持过的 info」
function proxyFn(vm, key, source) {
  Object.defineProperty(vm, key, {
    get() {
      return vm[source][key]
    },
    set(newVal) {
      vm[source][key] = newVal;
    }
  });
}

function initData(vm) {
  // 数据的初始化

  // 注意 data 可能是个对象 也可能是个函数
  //   + 对象：根实例
  //   + 函数：页面组件互相之间的数据隔离
  let data = vm.$options.data;

  // 注意修正 this，防止 data 函数执行 this 指向 window
  // 把 data 赋值给 vm 实例一个变量上，这里取名 _data，作为实例的属性数据源
  data = vm._data = isFunction(data) ? data.call(vm) : data;

  // 数据劫持
  observe(data);

  // 取 data.info => vm._data.info 做了一层代理获取到劫持后的 info
  // 这也是 vue 中我们可以用 this 访问和修改 data 中数据的原因
  for (let key in data) {
    proxyFn(vm, key, '_data');
  }
}

function initWatch(vm, watch) {
  for (let key in watch) {
    let handler = watch[key];

    if (Array.isArray(handler)) { // handler 为数组
      for (let i = 0; i < handler.length; i++) { 
        // 创建个 watcher 去监听数据变化
        createWatcher(vm, key, handler[i]);
      }
    } else { // handler 为函数
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher(vm, key, handler) {
  return vm.$watch(key, handler);
}

// 把 $watch 扩展到原型上
export function stateMixin(Vue) {
  Vue.prototype.$watch = function(key, handler, options = {}) {
    options.user = true; // 标识用户自己写的 watcher, 跟渲染 watcher 区分开

    new Watcher(this, key, handler, options);
  }
}