// 观察者收集器
// 每个属性上需要挂载一个 wacher 收集器 dep (defineReactive 方法顶部闭包方式保存)， 用来收集自己的 wachers，因为一个属性如果在多个组件用，是要多个 watcher
let id = 0; // 为了保证唯一性，也给加个序号

class Dep {
  constructor() {
    this.id = id++;
    this.subs = []; // 存放 watcher
  }

  depend() {
    // Dep.target  dep 里要存放这个 watcher，watcher 要存放 dep，多对多的关系
    if (Dep.target) {
      // 这一步最终结果是 dep 和 wacher 是互相存
      Dep.target.addDep(this);
    }
  }

  addSub(watcher) {
    this.subs.push(watcher);
  }
  
  // 通知更新
  notify() {
    // 属性一改可能会更新 n 次
    this.subs.forEach(watcher => watcher.update());
  }
}

Dep.target = null; // 静态属性

export function pushTarget(watcher) {
  Dep.target = watcher;
}

export function popTarget() {
  Dep.target = null;
}

export default Dep;