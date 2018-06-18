import * as Docker from 'dockerode';
export interface DockerOptions {
    socketPath?: string;
    host?: string;
    port?: number;
    ca?: string;
    cert?: string;
    key?: string;
    protocol?: "https" | "http";
    timeout?: number;
}
export declare class DockerServer {
    config?: DockerOptions;
    docker: Docker;
    constructor(config?: DockerOptions);
    inspectImage(imageTag: string): Promise<any>;
    tagImage(imageTag: string, newRepo: string, newTag: string): Promise<string>;
    changeImageTag(currentTag: string, newRepo: string, newTag: string): Promise<string>;
    pullImage(imageTag: string): Promise<string>;
    build(runtimeFolder: string, tag: string): Promise<string>;
    private preBuild;
    private runBuild;
    private postBuild;
    save(targetFile: string, tag: string): Promise<void>;
    deleteImage(tag: string): Promise<void>;
    areEqual(image1: string, image2: string): Promise<boolean>;
}
