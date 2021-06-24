export function isFunction(val) {
  return typeof val === 'function';
}

export function isObject(val) {
  return typeof val !== 'null' && typeof val === 'object'; 
}

export function isArray(val) {
  return Object.prototype.toString.call(val) === '[object Array]';
}