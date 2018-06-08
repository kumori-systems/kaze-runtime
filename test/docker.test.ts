import {} from 'jest';
import { DockerServer } from '../src/docker';

const DOCKER_HUB_TEST_IMAGE = 'kumori/test.image:2_0_0';
const IMG_NEW_NAME = 'tests.kumori.systems/runtimes/newtag:1_0_0';
const IMG_NEW_REPO = 'tests.kumori.systems/runtimes/newtag';
const IMG_NEW_VERSION = '1_0_0';

const USED_IMAGES = [
  DOCKER_HUB_TEST_IMAGE,
  IMG_NEW_NAME
]

let docker = null;

function deleteUsedImages() {
  let promises = [];
  for(var item of USED_IMAGES) {
    promises.push(docker.deleteImage(item).then(()=>{}).catch(()=>{}));
  }
  return Promise.all(promises);
}


beforeAll( (done) => {
  docker = new DockerServer();
  // Making sure images from previous tests don't exist
  deleteUsedImages()
  .then( () => {
    done();
  })
});


afterAll( (done) => {
  deleteUsedImages()
  .then( () => {
    done();
  })
});


test('Docker pull image', (done) => {

  docker.pullImage(DOCKER_HUB_TEST_IMAGE)
  .then( (imageTag) => {
    // console.log("DOCKER PULL RESOLVES TO " + imageTag);
    expect(imageTag).toEqual(DOCKER_HUB_TEST_IMAGE);
    return done()
  })
  .catch((err)=>{
    // console.log("DOCKER PULL FAILS. ERROR: " + err.message);
    return done(err);
  });
}, 180000);


test('Docker inspect image', (done) => {

  docker.inspectImage(DOCKER_HUB_TEST_IMAGE)
  .then( (data) => {
    // console.log("DOCKER INSPECT RESULT:" + JSON.stringify(data, null, 2));
    return done()
  })
  .catch((err)=>{
    // console.log("DOCKER INSPECT FAILS. ERROR: " + err.message);
    return done(err);
  });
}, 180000);


test('Docker tag image', (done) => {

  docker.tagImage(DOCKER_HUB_TEST_IMAGE, IMG_NEW_REPO, IMG_NEW_VERSION)
  .then( (imageTag) => {
    // console.log("DOCKER TAG RESOLVES TO " + imageTag);
    expect(imageTag).toEqual(IMG_NEW_NAME);
    return done()
  })
  .catch((err)=>{
    // console.log("DOCKER TAG FAILS. ERROR: " + err.message);
    return done(err);
  });
}, 180000);


test('Docker delete tag', (done) => {
  
  docker.deleteImage(IMG_NEW_NAME)
  .then( () => {
    // console.log("DOCKER DELETE IMAGE RESOLVES.");
    return done()
  })
  .catch((err)=>{
    // console.log("DOCKER DELETE IMAGE FAILS. ERROR: " + err.message);
    return done(err);
  });
}, 180000);


test('Docker change tag image', (done) => {
  
  docker.changeImageTag(DOCKER_HUB_TEST_IMAGE, IMG_NEW_REPO,
    IMG_NEW_VERSION)
  .then( (imageTag) => {
    expect(imageTag).toEqual(IMG_NEW_NAME);
    // console.log("RESULT: " + data);
    return done()
  })
  .catch((err)=>{
    // console.log("DOCKER TAG FAILS. ERROR: " + err.message);
    return done(err);
  });
}, 180000);


test('Docker delete new tag', (done) => {
  
  docker.deleteImage(IMG_NEW_NAME)
  .then( () => {
    return done()
  })
  .catch((err)=>{
    // console.log("DOCKER DELETE FAILS. ERROR: " + err.message);
    return done(err);
  });
}, 180000);


test('Docker delete removed tag (should fail)', (done) => {
  
  let EXPECTED_ERROR = '(HTTP code 404) no such image';

  docker.deleteImage(DOCKER_HUB_TEST_IMAGE)
  .then( () => {
    // console.log("DOCKER DELETE IMAGE RESOLVES.");
    throw new Error('Should have failed (wrong protocol)');
  })
  .catch((err)=>{
    // console.log("DOCKER DELETE FAILS. ERROR: " + err.message);
    if(!err.message.startsWith(EXPECTED_ERROR)) {
      throw err;
    }
    return done();
  });
}, 180000);

