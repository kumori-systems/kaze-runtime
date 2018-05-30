import { bundle } from '../src/index';
// import { Workspace } from '../src/workspace';
import { execSync, execFileSync } from 'child_process';
import { statSync, existsSync } from 'fs';

const WORKSPACE_PATH = `${process.cwd()}/test/workspace`;
const TMP_PATH = '/tmp/kaze';

afterAll(() => {
  execSync(`rm -r ${WORKSPACE_PATH}/runtimes/test.com/test/dist`);
  execSync(`rm -r ${TMP_PATH}`);
  execFileSync('docker', ['rmi', 'test.com/runtime/test:1_0_0']);
}) 

// export function bundle(runtimeFolder: string, manifestPath: string, targetFile: string): Promise<void> {
test('bundle', () => {
  console.log(`${process.cwd()}`);
  // let workspace = new Workspace(WORKSPACE_PATH);
  let runtimeFolder = `${WORKSPACE_PATH}/runtimes/test.com/test`;
  let manifestPath = `${runtimeFolder}/Manifest.json`;
  let targetFile = `${runtimeFolder}/dist/build.zip`;
  return bundle(runtimeFolder, manifestPath, targetFile)
  .then(() => {
    let stats = statSync(`${WORKSPACE_PATH}/runtimes/test.com/test/dist/build.zip`);
    expect(stats.isFile()).toBeTruthy();
    expect(existsSync(TMP_PATH)).toBeFalsy();
  });
}, 180000);