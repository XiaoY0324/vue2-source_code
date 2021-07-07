import { observe } from "./observer";
import { isFunction } from "./utils";

// 统一的数据的初始化分发
export function initState(vm) {
  const options = vm.$options;

  if (options.data) {
    initData(vm);
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