import { RuntimeHelper } from '../src/runtime-helper';

const helper = new RuntimeHelper();

test('RuntimeHelper functions', () => {

  let okUrns = [
    'eslap://eslap.cloud/runtimes/native/1_0_0',
    'eslap://eslap.cloud/runtimes/native/dev/privileged/1_0_1'
  ]

  for (let urn of okUrns) {
    // console.log('________________________________________________________');
    // console.log('URN: ' + urn);
    let data = helper.imageDataFromUrn(urn);
    // console.log('DATA: ' + JSON.stringify(data, null, 2));
    expect(data).toHaveProperty('urn');
    expect(data).toHaveProperty('hubName');
    expect(data).toHaveProperty('localName');
    expect(data).toHaveProperty('localRepo');
    expect(data).toHaveProperty('localVersion');
  }

  let EXPECTED_ERROR = "Runtime domain not supported"
  let someUrn = 'blabla://bleble/runtime/native/1_0_0'
  // console.log('________________________________________________________');
  // console.log('URN: ' + wrongUrn);
  // Expected response: {
  //   "urn": "blabla://bleble/runtime/native/1_0_0",
  //   "localName": "bleble/runtime/native:1_0_0",
  //   "localRepo": "bleble/runtime/native",
  //   "localVersion": "1_0_0",
  //   "hubName": "bleble/runtime/native:1_0_0"
  // }

  let data = helper.imageDataFromUrn(someUrn);
  expect(data).toHaveProperty('urn', someUrn)
  expect(data).toHaveProperty('localName', 'bleble/runtime/native:1_0_0')
  expect(data).toHaveProperty('localRepo', 'bleble/runtime/native')
  expect(data).toHaveProperty('localVersion', '1_0_0')
  expect(data).toHaveProperty('hubName', 'bleble/runtime/native:1_0_0')

}, 180000);
