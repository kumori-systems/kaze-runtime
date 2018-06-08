import * as runtime from '../src/index';
// import { Workspace } from '../src/workspace';
import { execSync, execFileSync } from 'child_process';
import { statSync, existsSync } from 'fs';

const USED_DOCKER_IMGS = [
  'test.com/runtime/test:1_0_0',
  'kumori/test.image:2_0_0',
  'eslap.cloud/test/image:2_0_0'
]

const WORKSPACE_PATH = `${process.cwd()}/test/workspace`;
const TMP_PATH = '/tmp/kaze';

function deleteDockerImage(imageName: string) {
  try {
    execFileSync('docker', ['rmi', '-f', imageName], { stdio: 'ignore' });
  } catch (error) {
    // console.log("ERROR DELETING IMAGE: " + error.message);
  }
}

function deletePath(p: string) {
  try {
    execSync(`rm -rf ${p}`);
  } catch (error) {
    // console.log("ERROR DELETING PATH " + p + " : " + error.message);
  }
}

function cleanup() {
  deletePath(WORKSPACE_PATH + "/runtimes/test.com/test/dist");
  deletePath(TMP_PATH);
  for(var item of USED_DOCKER_IMGS) {
    // console.log("Deleting image: " + item);
    deleteDockerImage(item);
  }
}

beforeAll( (done) => {
  cleanup();
  done();
}) 


afterAll( (done) => {
  cleanup()
  done();
}) 

// export function bundle(runtimeFolder: string, manifestPath: string, targetFile: string): Promise<void> {
test('bundle', () => {
  console.log(`${process.cwd()}`);
  // let workspace = new Workspace(WORKSPACE_PATH);
  let runtimeFolder = `${WORKSPACE_PATH}/runtimes/test.com/test`;
  let manifestPath = `${runtimeFolder}/Manifest.json`;
  let targetFile = `${runtimeFolder}/dist/build.zip`;
  return runtime.bundle(runtimeFolder, manifestPath, targetFile)
  .then(() => {
    let stats = statSync(`${WORKSPACE_PATH}/runtimes/test.com/test/dist/build.zip`);
    expect(stats.isFile()).toBeTruthy();
    expect(existsSync(TMP_PATH)).toBeFalsy();
  });
}, 180000);


test('Install runtime from URN', (done) => {

  let runtimeURN = 'eslap://eslap.cloud/test/image/2_0_0';

  runtime.install(runtimeURN)
  .then( () => {
    done();
  })
  .catch( (err) => {
    done(err);
  });
}, 60000);