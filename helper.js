const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const unzipper = require("unzipper");

const perfCMD = 'perf_4.19'
const perfTime = 60;


function execCMD(cmd, callback) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      console.log('shell: ',cmd)
      if (error) {
        console.error(`执行的错误: ${error}`);
        reject(error)
      }
      if(callback) {
        callback(stdout, stderr, resolve, reject);
      } else {
        resolve()
      }
    });
  })
}

class Flame {
  constructor() {

    this.nodes = [];

    this._init().catch(function(e){
      console.log(e)
    })
  }

  _init () {
    return new Promise((resolve, reject) => {
      const zipFilePath = path.join('.', 'FlameGraph.zip')
      const saveDir = process.cwd();
      fs.createReadStream(zipFilePath)
        .pipe(unzipper.Extract({ path: saveDir }))
        .on("error", reject)
        .on("finish", () => {
          console.log("zip finish");
          resolve();
        });
    }).then(() => {
      const cmd = `chmod 700 ./FlameGraph/stackcollapse-perf.pl`;
      return execCMD(cmd);
    }).then(() => {
      const cmd = `chmod 700 ./FlameGraph/flamegraph.pl`;
      return execCMD(cmd);
    }).then(() => {
      const cmd = `ps -ef|grep node|grep -v grep|grep -v FlameGraph|awk '{print $2}'`;
      return execCMD(cmd, (stdout, stderr, resolve, reject) => {
        this.nodes = stdout.split('\n').filter( pid => pid && pid != process.pid)
        resolve();
      });
    });
  }

  _chownMapFile(){
    const cmd = `chown root /tmp/perf-${this.nodes[0]}.map && ${perfCMD} script > nodestacks`;
    execCMD(cmd).then(() => {
      this._genFlameGraph();
    })
  }

  _genFlameGraph(){
    const cmd = `./FlameGraph/stackcollapse-perf.pl < nodestacks | ./FlameGraph/flamegraph.pl --colors js > node-flamegraph-${process.pid}.svg`
    execCMD(cmd).then(() => {
      console.log('had completed');
    })
  }

  record() {
    const cmd = `${perfCMD} record -F 99 -p ${this.nodes[0]} -g -- sleep ${perfTime}`;
    execCMD(cmd).then(() => {
      const t = 1000 * (perfTime + 5);
      setTimeout(() => {
        this._chownMapFile()
      }, 1000 * (perfTime + 5))
    })
  }
}

const flame = new Flame();
setTimeout(() => {
  // 模拟收到tcp命令
  flame.record();
}, 1000 * 5)
