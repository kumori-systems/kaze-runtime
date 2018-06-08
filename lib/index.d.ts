/**
* Install the Docker image corresponding to a given runtime URN. The image will
* be fetched from Docker Hub according to some conversion rules defined in
* DOMAIN_CONFIG.
*
*
* @param urn The runtime URN
* @returns a promise resolved once the runtime image is installed locally
*/
export declare function install(urn: string): Promise<any>;
export declare function bundle(runtimeFolder: string, manifestPath: string, targetFile: string): Promise<void>;
