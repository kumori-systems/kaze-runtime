/// <reference types="dockerode" />
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
    build(runtimeFolder: string, tag: string): Promise<string>;
    private preBuild(runtimeFolder, tag, onSuccess, onError);
    private runBuild(runtimeFolder, tag, onSuccess, onError);
    private postBuild(runtimeFolder, onSuccess, onError);
    save(targetFile: string, tag: string): Promise<void>;
    deleteImage(tag: string): Promise<void>;
}
