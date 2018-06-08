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
  let wrongUrn = 'blabla://bleble/runtime/native/1_0_0'
  // console.log('________________________________________________________');
  // console.log('URN: ' + wrongUrn);
  try {
    let data = helper.imageDataFromUrn(wrongUrn);
    // console.log('DATA: ' + JSON.stringify(data, null, 2));
    throw new Error('Should have failed (wrong protocol)');
  } catch (error) {
    // console.log("ERROR: " + error.message);
    // console.log("EXPECTED: " + EXPECTED_ERROR);
    // console.log("COND: " + error.message.startsWith(EXPECTED_ERROR));
    
    if(!error.message.startsWith(EXPECTED_ERROR)) {
      throw error;
    }
  }
  
}, 180000);
