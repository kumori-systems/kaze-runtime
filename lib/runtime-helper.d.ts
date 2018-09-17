export declare class RuntimeHelper {
    constructor();
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
     *   localImageName: "eslap.cloud/runtimes/native/dev/privileged:1_0_1",
     *   localRepo: "eslap.cloud/runtimes/native/dev/privileged",
     *   localVersion: "1_0_1",
     *   hubName: "kumori/runtimes.native.dev.privileged:1_0_1"
     * }
     *
     * @param urn The runtime URN
     * @returns returns an object containing the URN, the tag and it name in Hub
     */
    imageDataFromUrn(urn: string): {
        urn: string;
        localName: string;
        localRepo: any;
        localVersion: any;
        hubName: string;
    };
    private applySubstitutions;
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
    private deconstructURN;
}
