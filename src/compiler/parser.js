const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`; // 匹配标签名
const qnameCapture = `((?:${ncname}\\:)?${ncname})`; // 获取标签名
const startTagOpen = new RegExp(`^<${qnameCapture}`); // 匹配开始标签
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配闭合标签
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性的
const startTagClose = /^\s*(\/?)>/; // 匹配标签结束的 > 符号
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; // 匹配双花括号 {{}}

// 将解析后的结果 通过栈组装成一个 ast 树结构
function createAstElement(tagName, attrs) {
  return {
    tag: tagName,
    type: 1, // 元素类型
    children: [],
    parent: null,
    attrs
  }
}

let root = null; // 树的根节点
let stack = []; // 保存每个节点的栈

// 开始标签的处理方法
function start(tagName, attrs) {
  // console.log('start', tagName, attrs);
  // 构建 ast 语法树
  let element = createAstElement(tagName, attrs);
  // 取出栈中的父节点 做节点关联
  let parent = stack[stack.length - 1];

  if (!root) {
    root = element;
  }

  element.parent = parent; // 记录父节点是谁

  if (parent) {
    parent.children.push(element);
  }
  stack.push(element); // 入栈
}

// 结束标签的处理方法
function end(tagName) {
  // console.log('end tag:', tagName);
  let last = stack.pop(); // 弹出首位

  if (last.tag != tagName) {
    throw new Error('标签闭合有误');
  }
}

// 文本标签的处理方法
function chars(text) {
  text = text.replace(/\s/g, '');

  // 取出栈中的父节点 做节点关联
  let parent = stack[stack.length - 1];
  
  if (text) {
    parent.children.push({
      type: 3, // 文本标签
      text
    });
  }
}

// 将模板转成 ast 语法树
export function parserHTML(html) {
  // 解析完毕后 删除标签
  function advance(len) {
    html = html.substring(len);
  }

  // 解析开始标签
  function parseStartTag(){
    const start = html.match(startTagOpen);
    if(start){
        // 把标签和属性通过正则组装成对象
        const match = {
            tagName:start[1],
            attrs:[]
        }
        advance(start[0].length);
        let attr,end;
        while(!(end = html.match(startTagClose)) && (attr = html.match(attribute))){
            advance(attr[0].length);
            match.attrs.push({ name:attr[1], value:attr[3] });
        }
        if(end){
            advance(end[0].length);
            return match
        }
    }
}

  // 看看解析的内容是否存在 存在就不停解析
  while(html) {
     // 匹配开始或结束标签前面的 <
    let startOrEnd = html.indexOf('<');

    // 说明当前模板开头可能为开始标签<div>或结束标签</div>
    if (startOrEnd == 0) {
      // 尝试匹配开始标签 并把标签转成对象
      const startTagMatch = parseStartTag(html); 
      
      // 当前为开始标签
      if (startTagMatch) {
        // 处理开始标签转成的对象
        start(startTagMatch.tagName, startTagMatch.attrs);
        continue;
      }

      // 处理结束标签
      const endTagMatch = html.match(endTag);

      if (endTagMatch) {
        // 当前为结束标签
        end(endTagMatch[1]);
        advance(endTagMatch[0].length);
      }
    }

    // 处理文本 走到这里说明当前 html 为 123</div> 的
    let text;

    if (startOrEnd >= 0) {
      // 截取文本
      text = html.substring(0, startOrEnd);
    }

    if (text) {
      // 如果文本有值 处理文本并干掉文本
      chars(text);
      advance(text.length);
      continue;
    }
  }

  return root;
}
