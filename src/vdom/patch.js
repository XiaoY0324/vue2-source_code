/**
 * @description dom diff & 生成虚拟 dom 方法
 * @param { Element | Object } el 首次为真实 dom 节点，后续为虚拟 dom 
 * @param { Object } vnode 虚拟 dom 对象 
 */
export function patch(el, vnode) {
  // 首次渲染，el 为 vm.$el 是个真实节点, 此时把 vnode 生成真实 dom，整个替换
  if (el.nodeType == 1) {
    const parentElm = el.parentNode; // 找到挂载节点的父节点
    const newElm = createElm(vnode); // 根据虚拟节点 创建真实节点

    parentElm.insertBefore(newElm, el.nextSibling); // 放在挂载节点的下一个元素
    parentElm.removeChild(el); // 删除掉挂载节点
  }
}

// 创建真实 dom
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

  console.log(vnode.elm);
  return vnode.elm;
}