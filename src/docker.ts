import * as Docker from 'dockerode';
import * as fs from 'fs';
import * as child from 'child_process';


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

export class DockerServer {

  config?: DockerOptions;
  docker: Docker;

  constructor(config?: DockerOptions) {
    this.config = config;
    this.docker = new Docker(config);
  }

  // Build and tags new Docker image from a Dockerfile.
  public build(runtimeFolder: string, tag:string): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log("Runtime.build()");
      this.preBuild(runtimeFolder, tag, resolve, reject);
    })
  }

  // Executes a pre-build script if exists
  private preBuild(runtimeFolder:string, tag:string, onSuccess:any, onError:any){    
    let self = this;
    let preBuildScriptPath = runtimeFolder+"/pre_build.sh";
    if (fs.existsSync(preBuildScriptPath)){
      console.log("Executing pre_build.sh...");
      let execution = child.spawn("/bin/bash", [preBuildScriptPath, tag, runtimeFolder]);
      execution.stderr.on('data', (data: Buffer)=>{
        console.log("stderr: " + data.toString());
      });
      execution.stdout.on('data', (data: Buffer)=>{
        console.log("stdout: " + data.toString());
      });
      execution.on('exit', (code)=>{
        console.log("Pre-Build finished OK.");
        if(code == 0){
          self.runBuild(runtimeFolder, tag, onSuccess, onError);
        }else{
          onError("Pre-Build failed. Code:" + code);
        }
      });
    }else{
      self.runBuild(runtimeFolder, tag, onSuccess, onError);
    }
  }

  // It builds the Docker Image
  private runBuild(runtimeFolder:string, tag:string, onSuccess:any, onError:any){
    console.log("Building Docker image...");
    let self = this;
    let execution = child.spawn("docker", ["build", "--rm", "-t", tag, "."], {cwd: runtimeFolder});
    execution.stderr.on('data', (data: Buffer)=>{
      console.log("stderr: " + data.toString());
    });
    execution.stdout.on('data', (data: Buffer)=>{
      console.log("stdout: " + data.toString());
    });
    execution.on('exit', (code)=>{
      console.log("Build finished OK.");
      if(code == 0){
        self.postBuild(runtimeFolder, onSuccess, onError);
      }else{
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
  private postBuild(runtimeFolder:string, onSuccess:any, onError:any){
    let self = this;
    let postBuildScriptPath = runtimeFolder+"/post_build.sh";
    if (fs.existsSync(postBuildScriptPath)){
      console.log("Executing post_build.sh...");
      let execution = child.spawn("/bin/bash", [postBuildScriptPath, runtimeFolder]);
      execution.stderr.on('data', (data: Buffer)=>{
        console.log("stderr: " + data.toString());
      });
      execution.stdout.on('data', (data: Buffer)=>{
        console.log("stdout: " + data.toString());
      });
      execution.on('exit', (code)=>{
        console.log("Post-Build finished OK.");
        if(code == 0){
          onSuccess();
        }else{
          onError("Post-Build failed. Code:" + code);
        }
      });
    }else{
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
  public save(targetFile: string, tag: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let image = this.docker.getImage(tag);
        image.get((error, data) => {
          try {
            if (error) {
              reject(error);
            } if (!data) {
              reject(new Error(`Data not found. Image ${tag} seems to be empty`));
            } else {
              let stream = fs.createWriteStream(targetFile);
              data.pipe(stream);
              stream.on('error', (error) => {
                reject(error);
              })
              stream.on('close', () => {
                resolve();
              })
              data.on('end', () => {
                stream.close();
              })
            }
          } catch(error) {
            reject(error);
          }
        });
      } catch(error) {
        reject(error);
      }
    })
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

  public deleteImage(tag: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let image = this.docker.getImage(tag);
        image.remove((error, result) => {
          if (error) {
            reject(error);
          } else {
            console.log("RESULT", result);
            resolve();
          }
        });
      } catch(error) {
        reject(error);
      }
    });
  }

  // public deleteImage(imageId: string): Promise<void> {
  //   return new Promise((resolve, reject) => {
  //     try {
  //       execFile('docker', ['rmi', imageId], (error, _, stderr) => {
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
}