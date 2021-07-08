import { isArray, isObject } from "../utils";
import arrayMethod from "./array"; // 数组结束(方法重写)
import Dep from "./dep";

// 观察者类
// 如果给对象新增一个属性不会触发视图更新(给对象本身也增加一个 dep，dep 中存 watcher，如果增加一个属性后，我就手动的触发 watcher 的更新)
class Observer {
  constructor(val) {
    // 给 Observer 实例增加一个 dep 属性，也就是 val.__ob__.dep
    // 注意此时 val 可能是对象也可能是数组，数组我们是需要加的，用于调用七种方法是调用 dep.notify
    // 对象加上也不影响，因为对象加属性是不会触发更新的(没有劫持)，而且后面实现对象 $set 需要使用到这个 dep
    this.dep = new Dep(); 

    // 给对象和数组添加一个自定义属性，用于数组新增元素时的再次劫持
    // 不过切记 __ob__ 属性不能被枚举，不然如果 val 是个对象的话，就会把 __ob__ 也劫持
    // 这也是我们看到所有的 Vue 变量都有 __ob__ 属性的原因
    Object.defineProperty(val, '__ob__', {
      value: this,
      enumerable: false
    });

    if (isArray(val)) { // 我希望数组的变化可以触发视图更新
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

// 对数组里面的数组进行依赖收集
function dependArray(val) {
  for (let i = 0; i < val.length; i++) {
    let current = val[i]; // current 是数组里面的数组

    current.__ob__ && current.__ob__.dep.depend(); 

    // 递归收集，使闭包内的 Dep 保存 wacher
    if (Array.isArray(current)) {
      dependArray(current);
    }
  }
}

// vue2 慢的一个原因
// 这里引出几条 vue2 的性能优化原则
//   @1 不要把所有的数据都放在 data 中，闭包过多会损耗性能
//   @2 尽量扁平化数据，不要嵌套多次，递归影响性能
//   @3 不要频繁获取数据，会触发 get 方法，走 get 方法中的全部逻辑
//   @4 如果数据某属性不需要响应式，可以使用 Object.freeze 冻结属性「源码里会跳过 defineReactive」
function defineReactive(obj, key, value) {
  // 进行劫持(递归) 对象或数组返回 Observer 实例，普通值返回 undefined
  let childOb = observe(value); 
  let dep = new Dep(); // 给当前变量声明一个 Dep(闭包中保存)，并收集 watcher

  // console.log(childOb, '就是当前数据 Observer 实例');

  Object.defineProperty(obj, key, {
    get() {
      // 这里就形成一个闭包，每次执行 defineReactive 上下文都不会被释放
      // 所以这就是 vue2 的性能瓶颈
      // console.log(key, 'get 取值啦');
      if (Dep.target) {
        // 说明是解析模板内变量 也就是 render 执行时候用到的 vm 中变量取值
        // console.log('渲染模板内属性', key);
        // 模板内变量的 Dep 里收集 watcher
        dep.depend();

        // 数组本身添加 Dep 收集 watcher 去更新(对象也会被添加 Dep，但是对象的 Dep 暂时没有使用哦)
        // 如果 value 是个普通值，则 childOb 为 undefined
        if (childOb) { 
          // 让数组和对象也记录 Dep，收集 watcher
          childOb.dep.depend();

          // 如果当前 value 个数组，需要考虑二维数组的情况，因为某个字段是多维数组，取值只触发最外层数组的一次 get
          // 比如 hobbys -> [[1, 2, 3]]，我想让 hobbys[0].push('4') 也能更新
          // 取外层数组要对里面的 item 也行依赖收集 
          if (Array.isArray(value)) {
            console.log(value);
            dependArray(value);
          }
        }
      }
      
      return value;
    },
    set(newValue) {
      if (newValue !== value) {
        // console.log('触发set方法');
        // 设置新值重新劫持 
        observe(newValue); 
        value = newValue;
        // 每个属性的闭包中的 dep 实例
        dep.notify(); // 告诉当前属性存放的 watcher 执行
      }
    }
  });
}

export function observe(data) {
  // 如果不是对象，直接返回「非对象类型不进行递归劫持」
  if (!isObject(data)) return;

  // 如果被劫持过，就不再进行劫持了
  // 劫持过的话，把上次劫持的 Oberver 对象返回
  if (data.__ob__) {
    return data.__ob__;
  };

  // 如果一个数据被劫持过了，就不要重复劫持了，这里用类来实现
  // 劫持过的对象 把类的实例挂在到 data.__ob__
  return new Observer(data);
}