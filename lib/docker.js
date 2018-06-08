"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const child = require("child_process");
const Docker = require("dockerode");
class DockerServer {
    constructor(config) {
        this.config = config;
        this.docker = new Docker(config);
    }
    // Gather information about an image
    inspectImage(imageTag) {
        // console.log("INSPECTING " + imageTag + " ...");
        return new Promise((resolve, reject) => {
            let image = this.docker.getImage(imageTag);
            image.inspect((err, data) => {
                if (err) {
                    return reject(new Error('Error inspecting image ' + imageTag + ' : ' +
                        err));
                }
                else {
                    return resolve(data);
                }
            });
        });
    }
    // Tag an image (named after imageTag) with a new repo name and tag
    tagImage(imageTag, newRepo, newTag) {
        // console.log("TAGGING " + imageTag + " as " + newRepo + ":" + newTag + " ...");
        return new Promise((resolve, reject) => {
            let image = this.docker.getImage(imageTag);
            // console.log("IMAGE: " + image);
            image.tag({ repo: newRepo, tag: newTag }, (err, data) => {
                if (err) {
                    return reject(new Error('Error tagging image ' + imageTag + ' as ' +
                        newRepo + ":" + newTag + ' : ' + err));
                }
                else {
                    return resolve(newRepo + ":" + newTag);
                }
            });
        });
    }
    // "Rename" an image, by creating a new tag and removing the old one
    changeImageTag(currentTag, newRepo, newTag) {
        return new Promise((resolve, reject) => {
            this.tagImage(currentTag, newRepo, newTag)
                .then((imageTag) => {
                return this.deleteImage(currentTag);
            })
                .then(() => {
                resolve(newRepo + ":" + newTag);
            })
                .catch((err) => {
                reject(err);
            });
        });
    }
    // Pull an image from Docker Hub
    pullImage(imageTag) {
        return new Promise((resolve, reject) => {
            this.docker.pull(imageTag, (err, stream) => {
                this.docker.modem.followProgress(stream, onFinished, onProgress);
                function onFinished(err, output) {
                    if (err) {
                        return reject(new Error('Error pulling image ' + imageTag + ' : ' +
                            err));
                    }
                    else {
                        return resolve(imageTag);
                    }
                }
                function onProgress(event) { }
            });
        });
    }
    // Build and tags new Docker image from a Dockerfile.
    build(runtimeFolder, tag) {
        return new Promise((resolve, reject) => {
            // console.log("Runtime.build()");
            this.preBuild(runtimeFolder, tag, resolve, reject);
        });
    }
    // Executes a pre-build script if exists
    preBuild(runtimeFolder, tag, onSuccess, onError) {
        let self = this;
        let preBuildScriptPath = runtimeFolder + "/pre_build.sh";
        if (fs.existsSync(preBuildScriptPath)) {
            console.log("Executing pre_build.sh...");
            let execution = child.spawn("/bin/bash", [preBuildScriptPath, tag, runtimeFolder]);
            execution.stderr.on('data', (data) => {
                console.log("stderr: " + data.toString());
            });
            execution.stdout.on('data', (data) => {
                console.log("stdout: " + data.toString());
            });
            execution.on('exit', (code) => {
                console.log("Pre-Build finished OK.");
                if (code == 0) {
                    self.runBuild(runtimeFolder, tag, onSuccess, onError);
                }
                else {
                    onError("Pre-Build failed. Code:" + code);
                }
            });
        }
        else {
            self.runBuild(runtimeFolder, tag, onSuccess, onError);
        }
    }
    // It builds the Docker Image
    runBuild(runtimeFolder, tag, onSuccess, onError) {
        console.log("Building Docker image...");
        let self = this;
        let execution = child.spawn("docker", ["build", "--rm", "-t", tag, "."], { cwd: runtimeFolder });
        execution.stderr.on('data', (data) => {
            console.log("stderr: " + data.toString());
        });
        execution.stdout.on('data', (data) => {
            console.log("stdout: " + data.toString());
        });
        execution.on('exit', (code) => {
            console.log("Build finished OK.");
            if (code == 0) {
                self.postBuild(runtimeFolder, onSuccess, onError);
            }
            else {
                onError("Build failed. Code:" + code);
            }
        });
    }
    // It builds the runtime by mean of a Dockerfile
    // private runBuild(runtimeFolder:string, tag:string, onSuccess:any, onError:any){
    //   console.log("Runtime.runBuild()");
    //   let self = this;
    //   try {
    //     this.docker.buildImage(
    //       {
    //         context: runtimeFolder,
    //         src: ['Dockerfile'],
    //       },{
    //         t: tag
    //       }, (err, response) => {
    //         if (err) {              
    //           onError(err)
    //         } else {
    //           response.pipe(process.stdout);
    //           //console.log(response);
    //           self.postBuild(runtimeFolder, onSuccess, onError);
    //         }
    //       }
    //     )
    //   } catch(error) {
    //     onError(error);
    //   }
    // }
    // Executes a post-build script if exists
    postBuild(runtimeFolder, onSuccess, onError) {
        let self = this;
        let postBuildScriptPath = runtimeFolder + "/post_build.sh";
        if (fs.existsSync(postBuildScriptPath)) {
            console.log("Executing post_build.sh...");
            let execution = child.spawn("/bin/bash", [postBuildScriptPath, runtimeFolder]);
            execution.stderr.on('data', (data) => {
                console.log("stderr: " + data.toString());
            });
            execution.stdout.on('data', (data) => {
                console.log("stdout: " + data.toString());
            });
            execution.on('exit', (code) => {
                console.log("Post-Build finished OK.");
                if (code == 0) {
                    onSuccess();
                }
                else {
                    onError("Post-Build failed. Code:" + code);
                }
            });
        }
        else {
            onSuccess();
        }
    }
    // public tag(imageId: string, tag: string): Promise<void> {
    //   return new Promise((resolve, reject) => {
    //     try {
    //       execFile('docker', ['tag', imageId, tag], (error, _, stderr) => {
    //         if (error) {
    //           reject(error);
    //         } else if (stderr) {
    //           reject(stderr);
    //         } else {
    //           resolve();                    
    //         }
    //       });
    //     } catch(error) {
    //       reject(error);
    //     }  
    //   })
    // }
    // Saves a Docker image in a file
    save(targetFile, tag) {
        return new Promise((resolve, reject) => {
            try {
                let image = this.docker.getImage(tag);
                image.get((error, data) => {
                    try {
                        if (error) {
                            reject(error);
                        }
                        if (!data) {
                            reject(new Error(`Data not found. Image ${tag} seems to be empty`));
                        }
                        else {
                            let stream = fs.createWriteStream(targetFile);
                            data.pipe(stream);
                            stream.on('error', (error) => {
                                reject(error);
                            });
                            stream.on('close', () => {
                                resolve();
                            });
                            data.on('end', () => {
                                stream.close();
                            });
                        }
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    // public save(targetFile: string, tag: string): Promise<void> {
    //   return new Promise((resolve, reject) => {
    //     try {
    //       execFile('docker', ['save', '-o', targetFile, tag], (error, _, stderr) => {
    //         if (error) {
    //           reject(error);
    //         } else if (stderr) {
    //           reject(stderr);
    //         } else {
    //           resolve();                    
    //         }
    //       });
    //     } catch(error) {
    //       reject(error);
    //     }  
    //   })
    // }
    deleteImage(tag) {
        return new Promise((resolve, reject) => {
            try {
                let image = this.docker.getImage(tag);
                image.remove((error, result) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        // console.log("RESULT", result);
                        resolve();
                    }
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
}
exports.DockerServer = DockerServer;
//# sourceMappingURL=docker.js.map