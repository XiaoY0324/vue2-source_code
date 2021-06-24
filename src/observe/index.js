import { isArray, isObject } from "../utils";
import arrayMethod from "./array";

// 观察者类
class Observer {
  constructor(val) {
    // 给对象和数组添加一个自定义属性，用于数组新增元素时的再次劫持
    // 不过切记 __ob__ 属性不能被枚举，不然如果 val 是个对象的话，就会把 __ob__ 也劫持
    // 这也是我们看到所有的 Vue 变量都有 __ob__ 属性的原因
    Object.defineProperty(val, '__ob__', {
      value: this,
      enumerable: false
    });

    if (isArray(val)) {
      // 如果是 val 数组，修改原型方法 这里就不考虑兼容 ie 了
      // 这里只针对 data 中的数组，没有重写 Array.prototype 上的方法
      val.__proto__ = arrayMethod;
      this.observeArray(val);
    } else {
      this.walk(val); // 遍历属性进行劫持
    }
  }

  // 递归遍历数组，对数组内部的对象再次重写 比如 [{}]  [[]]
  // 需要注意的是: 数组套对象的话，修改对象属性，也会触发更新，比如：
  // vm.arr[0].a = 100 ----> 触发更新
  // vm.arr[0] = 100   ----> 不会触发更新
  observeArray(val) {
    // 调用 observe 方法，数组内元素如果不是对象，则不会劫持
    val.forEach(itm => observe(itm));
  }

  // 遍历对象
  walk(data) {
    Object.keys(data).forEach(key => {
      // 使用 defineProperty 重新定义
      defineReactive(data, key, data[key]);
    })
  }
}

// vue2 慢的一个原因
// 这里引出几条 vue2 的性能优化原则
//   @1 不要把所有的数据都放在 data 中，闭包过多会损耗性能
//   @2 尽量扁平化数据，不要嵌套多次，递归影响性能
//   @3 不要频繁获取数据，会触发 get 方法，走 get 方法中的全部逻辑
//   @4 如果数据某属性不需要响应式，可以使用 Object.freeze 冻结属性「源码里会跳过 defineReactive」
function defineReactive(obj, key, value) {
  observe(value); // 递归进行劫持
  Object.defineProperty(obj, key, {
    get() {
      // 这里就形成一个闭包，每次执行 defineReactive 上下文都不会被释放
      // 所以这就是 vue2 的性能瓶颈
      return value;
    },
    set(newValue) {
      if (newValue == value) return;
      console.log('触发set方法');
      // 设置新值重新劫持 
      observe(newValue); 
      value = newValue;
    }
  });
}

export function observe(data) {
  // 如果不是对象，直接返回「非对象类型不进行递归劫持」
  if (!isObject(data)) return;

  // 如果被劫持过，就不再进行劫持了
  if (data.__ob__) return;

  // 如果一个数据被劫持过了，就不要重复劫持了，这里用类来实现
  // 劫持过的对象 把类的实例挂在到 data.__ob__
  return new Observer(data);
}