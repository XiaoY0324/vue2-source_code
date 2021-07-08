import { nextTick } from "../utils";

// wactcher 调度 
let queue = [];
let has = {}; // 存放 wacher ID，防止相同 watcher 更新多次
let pending = false; 

// 清空 wacher 队列，每一个 watcher 都是一次更新操作(render + patch)
function flushSchedulerQueue() {
  for (let i = 0; i < queue.length; i++) {
    queue[i].run(); // 更新
  }

  queue = [];
  has = {};
  pending = false;
}

export function queueWatcher(watcher) {
  let id = watcher.id;

  if (has[id] == null) {
    queue.push(watcher);
    has[id] = true;

    // 开启一次异步批处理更新(防抖)
    if (!pending) {
       console.log('dom 更新 run');
       
       // 不能使用延时器，不然我们想拿到更新后的 dom 节点，只能通过 setTimeout 去拿
       // 而且，我们希望尽早更新，同步代码执行完毕会先执行微任务，而不想等 setTimeout
      // setTimeout(flushSchedulerQueue, 0);

      nextTick(flushSchedulerQueue);
      pending = true;
    }
  }
}

