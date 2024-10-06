const { sh } = require('./helper'); // Require statement modified from '.' to './helper'

function add(a, b) {
    return a + b;
}

console.log(add(5, 3));
sh.concatenate('Hello', 'World!');