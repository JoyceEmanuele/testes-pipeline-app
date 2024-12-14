import { spawn } from "node:child_process";

// runService('serviceGateway');
runService('serviceAuth');
runService('serviceApiAsync');
runService('serviceHealth');
runService('serviceRealtime');
runService('serviceBGTasks');

function runService(serviceName, pathToMain) {
  if (!pathToMain) pathToMain = `./dist/${serviceName}/main.js`;
  const proc = spawn('node', [pathToMain]);

  proc.stdout.on('data', (data) => {
    for (let line of String(data).split('\n').map(x => x.trimEnd()).filter(x => !!x)) {
      console.info(`${serviceName}:\t${line}`);
    }
  });

  proc.stderr.on('data', (data) => {
    for (let line of String(data).split('\n').map(x => x.trimEnd()).filter(x => !!x)) {
      console.info(`${serviceName}:\t${line}`);
    }
  });

  proc.on('close', (code) => {
    console.info(`${serviceName}: child process exited with code ${code}`);
  });

  proc.on('error', (err) => {
    console.info(`${serviceName} (error): ${err}`);
  })
}
