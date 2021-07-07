// Dep 上挂载 watcher 的方式，之后会改
import { popTarget, pushTarget } from "./dep"; 
import { queueWatcher } from "./scheduler";

let id = 0; // 每 new 一次 watcher，id++

// 观察者类
class Watcher {
  // exprOrFn: 可能是个表达式(计算属性)或者更新的函数(vm._update(vm._render()))
  constructor(vm, exprOrFn, cb, options) {
    this.vm = vm;
    this.exprOrFn = exprOrFn;
    this.cb = cb;
    this.options = options;
    this.id = id++; // watcher 类实例化计数
    this.deps = [];
    // 防止一个模板绑定两次相同的值 存两个 dep <span> {{ msg + msg }}}</span>
    this.depsId = new Set(); 

    // render 方法会去 vm 上重新取值，生成虚拟 dom，我们这里把它重命名为 getter
    this.getter = exprOrFn;

    // 更新函数默认执行一次，首次渲染页面(生成虚拟 dom -> diff -> 真实 dom)
    this.get();
  }

  // 重新取值并渲染，取值会调用 defineProperty.get 方法，我们让每个属性都能收集自己的 watcher(多对多的关系)
  // 每个组件的渲染都会初始化一个 wacher，组件内属性跟 watcher 做绑定
  // 每个属性可能有多个 watcher(全局的属性 msg 100 个组件使用，就会声明 100 个 wacher 实例跟 msg 做绑定)
  // 同一个 watcher 实例可能对应 n 多属性，比如 A 组件内有 100 变量，该 watcher 会收集 100 个 dep 供后续使用
  // 为了收集以上关系，我们声明一个 Dep 类
  get() {
    // console.log('dom 渲染');
    // 注意，这里代码只有要更新页面时(getter 就是更新页面方法)，才会走
    // 模板内绑定的变量，取值之前这里设置 Dep.target -> wacher
    // 注意，普通的 vm.msg 取值不会走该方法，也就是普通的读取变量 Dep.target -> null
    pushTarget(this); 
    // 只有取值的时候，把当前 watcher 收集到当前属性的收集器 Dep 上，并渲染页面
    // 也就是说，当前变量在模板中使用到了，才会去收集 watcher (没用到不取)
    this.getter();
    // 取值之后 立马清空挂载的 wacher 实例
    popTarget(); 
  } 

  // 双向收集
  addDep(dep) {
    let id = dep.id;

    // 如果没存过这个 dep， 再存
    if (!this.depsId.has(id)) {
      this.depsId.add(id);
      this.deps.push(dep);
      dep.addSub(this);
    }
  }

  // 存起来要更新的操作，交给调度器
  update() {
    // 缓存 wacher，多次调用先缓存，等会儿去重一起更新。
    // 这就是为什么 vue 的数据更新是异步的
    queueWatcher(this);
  }

  // 调度器更新实际调用的方法
  run() {
    // 渲染操作的更新方法，后续还有其他更新
    this.get();
  }
}

export default Watcher;