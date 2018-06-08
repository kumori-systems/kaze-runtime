import * as url from 'url';

const DOMAIN_CONFIG = {
  "eslap.cloud": {
    repositoryPrefix: "kumori/",
    tagPrefix: "eslap.cloud/",
    tagToRepoSubstitutions: [ { src: "/", dst: "." } ]
  }
}

export class  RuntimeHelper {

  constructor() {}
  
  /**
   * Get a runtime image tag and its name in DockerHub from its URN, according to
   * some conversion rules defined in DOMAIN_CONFIG.
   * 
   * Example: 
   * 
   * URN: eslap://eslap.cloud/runtimes/native/dev/privileged/1_0_1
   * 
   * RESULT: {
   *   urn: "eslap://eslap.cloud/runtimes/native/dev/privileged/1_0_1",
   *   tagName: "eslap.cloud/runtimes/native/dev/privileged:1_0_1",
   *   hubName: "kumori/runtimes.native.dev.privileged:1_0_1"
   * }
   * 
   * @param urn The runtime URN
   * @returns returns an object containing the URN, the tag and it name in Hub
   */
  public imageDataFromUrn(urn: string) {
    let urnParts = this.deconstructURN(urn);
    
    if (! (urnParts.domain in DOMAIN_CONFIG)) {
      throw new Error('Runtime domain not supported: ' + urnParts.domain);
    }
  
    if (urnParts.imageRoot.indexOf('.') > -1) {
      throw new Error("Runtime name can't contain dots outside domain:" + urn);
    }
    
    let domainConfig = DOMAIN_CONFIG[urnParts.domain];
    
    // Names expected by ECloud for the runtime image
    let localImageName = domainConfig.tagPrefix + urnParts.imageRoot + ':' +
    urnParts.imageVersion;
    let localImageRepo = domainConfig.tagPrefix + urnParts.imageRoot;
    let localImageVersion = urnParts.imageVersion;
    
    let imageTagName = domainConfig.tagPrefix + urnParts.imageRoot + ':' +
      urnParts.imageVersion;
      
      let escapedImageRoot = this.applySubstitutions(urnParts.imageRoot,
        domainConfig.tagToRepoSubstitutions);
        let imageHubName = domainConfig.repositoryPrefix + escapedImageRoot  + ':' +
        urnParts.imageVersion;
        let result = {
          urn: urn,
      localName: localImageName,
      localRepo: localImageRepo,
      localVersion: localImageVersion,
      hubName: imageHubName
    }
    // console.log("IMAGE DATA: " + JSON.stringify(result, null, 2));
    return result;
  }
    
  private applySubstitutions(str: string, subs: Array<any>) {
    for (var sub of subs) {
      str = str.split(sub.src).join(sub.dst);
    }
    return str;
  }
  
  /**
  * Deconstruct a runtime URN and return an object with all its parts.
  * 
  * Example: 
  * 
  * URN: eslap://eslap.cloud/runtimes/native/dev/privileged/1_0_1
  * 
  * DECONSTRUCTION: {
  *   domain: "eslap.cloud",
  *   imagePrefix: "eslap.cloud/",
  *   imageRoot: "runtimes/native/dev/privileged",
  *   imageVersion: "1_0_1"
  * }
  * 
  * @param urn The URN to deconstruct
  * @returns returns an object containing the deconstructed URN parts
  */
 private deconstructURN(urn: string): any {
  // console.log("URN: " + urn);
  let parsed = url.parse(urn);
  // console.log("PARSED: " + JSON.stringify(parsed, null, 2));
  let domain = parsed.host;
  // console.log("PATH: " + parsed.pathname);
  let pathElements = parsed.pathname.split('/');
  // Parsed.pathname starts with slash, so first element is empty. Remove it
  pathElements.shift();
  // console.log("PATH ELEMENTS: " + pathElements);
  let imagePrefix = domain + '/';
  // console.log("PATH ELEMENTS: " + pathElements);
  // Version is the last component of the path. Pop it and keep it
  let imageVersion = pathElements.pop();
  let imageRoot = pathElements.join('/');
  let result = {
    domain: domain,
    imagePrefix: imagePrefix,
    imageRoot: imageRoot,
    imageVersion: imageVersion
  }
  // console.log("URN: " + urn);
  // console.log("DECONSTRUCTED URN: " + JSON.stringify(result, null, 2));
  return result;
}
 

}
