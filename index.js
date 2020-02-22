const {fork } = require('child_process')
fork('./helper')

fibonacci(50)

function fibonacci(n) {
  if(n==0 || n == 1) return n;
  return fibonacci(n-1) + fibonacci(n-2);
}
