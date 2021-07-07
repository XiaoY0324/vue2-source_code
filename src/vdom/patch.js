/**
 * @description dom diff & 生成虚拟 dom 方法
 * @param { Element | Object } el 根 dom 节点
 * @param { Object } vnode 虚拟 dom 对象 
 */
export function patch(curElm, vnode) {
  // 把 vnode 生成真实 dom，挂载节点整个替换
  if (curElm.nodeType == 1) {
    const parentElm = curElm.parentNode; // 找到挂载节点的父节点
    const newElm = createElm(vnode); // 根据虚拟节点 创建真实节点

    parentElm.insertBefore(newElm, curElm.nextSibling); // 放在挂载节点的下一个元素
    parentElm.removeChild(curElm); // 删除掉挂载节点

    return newElm; // 新的根节点返还 重新挂载到 vm.$el 上
  }
}

// 创建真实 dom，并插入到页面(父节点)
function createElm(vnode) {
  let { tag, data, children, text, vm } = vnode;

  if (typeof tag === 'string') { 
    // 元素节点
    // 把当前真实节点挂载到虚拟节点的 elm 属性上，方便下层使用
    vnode.elm = document.createElement(tag); 

    // 处理子节点(树的深度遍历)
    children.forEach(child => {
      // 插入到父真实节点上
      // console.log(child);
      vnode.elm.appendChild(createElm(child));
    });
  } else {
    // 文本节点
    // console.log('------text-------', text, vnode);
    vnode.elm = document.createTextNode(text);
  }

  return vnode.elm;
}