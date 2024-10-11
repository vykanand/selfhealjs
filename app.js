const { helpFn } = require('./ukm/yt');

function add(a, b) {
    return a + b;
}

function subtract(a, b) {
    return a - b;
}

console.log(add(5, 3));
console.log(subtract(5, 2));
console.log(subtract(15, 2));
console.log(helpFn("hello", "world"))
console.log(add(4, 3));