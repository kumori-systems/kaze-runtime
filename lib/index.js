"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docker_1 = require("./docker");
const runtime_helper_1 = require("./runtime-helper");
const fs_1 = require("fs");
const q = require("q");
const ncp = require("ncp");
let ncp_ = q.denodeify(ncp);
const archiver = require("archiver");
const mkdirp = require("mkdirp");
const rmrf = require("rimraf");
const vm = require("vm");
const checksum = require("checksum");
let checksumFile = q.denodeify(checksum.file);
const tar = require("tar-fs");
const fs = require("fs");
let stat = q.denodeify(fs.stat);
const globCopy = require("glob-copy");
let globCopy_ = q.denodeify(globCopy);
const url = require("url");
const path = require("path");
const child_process = require("child_process");
// Put this in a configuration file
const TMP_PATH = '/tmp/kaze';
const docker = new docker_1.DockerServer();
const helper = new runtime_helper_1.RuntimeHelper();
const MANIFEST_FILENAME = 'Manifest.json';
/**
* Install the Docker image corresponding to a given runtime URN. The image will
* be fetched from Docker Hub according to some conversion rules defined in
* DOMAIN_CONFIG.
*
*
* @param urn The runtime URN
* @returns a promise resolved once the runtime image is installed locally
*/
function install(urn) {
    let imageData = helper.imageDataFromUrn(urn);
    // Pull image from Hub
    return docker.pullImage(imageData.hubName)
        .then((imageTag) => {
        // Rename image to expected tag
        return docker.changeImageTag(imageTag, imageData.localRepo, imageData.localVersion);
    });
}
exports.install = install;
function getJSON(filepath) {
    const jsonString = "g = " + fs_1.readFileSync(filepath, 'utf8') + "; g";
    return (new vm.Script(jsonString)).runInNewContext();
}
function untar_(tarfile, dstPath) {
    return new Promise((resolve, reject) => {
        let input = fs.createReadStream(tarfile);
        input.on('error', (err) => {
            reject(err);
        })
            .pipe(tar.extract(dstPath))
            .on('finish', () => {
            resolve();
        })
            .on('error', (err) => {
            reject(err);
        });
    });
}
function tar_(srcPath, tarfile) {
    return new Promise((resolve, reject) => {
        let out = fs.createWriteStream(tarfile);
        tar.pack(srcPath).pipe(out);
        out.on('finish', () => {
            resolve();
        });
        out.on('error', (err) => {
            reject(err);
        });
    });
}
function bundle(runtimeFolder, manifestPath, targetFile) {
    try {
        if ((!runtimeFolder) || (runtimeFolder.length == 0)) {
            return Promise.reject('Runtime folder not found');
        }
        if ((!manifestPath) || (manifestPath.length == 0)) {
            return Promise.reject('Manifest path undefined');
        }
        if ((!targetFile) || (targetFile.length == 0)) {
            return Promise.reject('Target file undefined');
        }
        let stats = fs_1.statSync(runtimeFolder);
        if (!stats.isDirectory()) {
            return Promise.reject(`${runtimeFolder} is not a folder`);
        }
        stats = fs_1.statSync(manifestPath);
        if (!stats.isFile()) {
            return Promise.reject(`${manifestPath} should be a file`);
        }
        let lastSlash = targetFile.lastIndexOf('/');
        if (lastSlash > 0) {
            let targetFolder = targetFile.substring(0, lastSlash);
            mkdirp.sync(targetFolder);
        }
        let manifest = getJSON(manifestPath);
        let parts = manifest.name.split('/');
        let domain = parts[2];
        let path_ = `${parts[4]}`;
        for (let i = 5; i < (parts.length - 1); i++) {
            path_ = `${path_}/${parts[i]}`;
        }
        let versionTag = `${parts[parts.length - 1]}`;
        let targetTag = `${domain}/runtime/${path_}:${versionTag}`;
        let targetFolder = path.join(TMP_PATH, 'runtime', domain, path_);
        let deltaDir = path.join(TMP_PATH, 'runtime', domain, path_, 'delta');
        child_process.execSync(`rm -rf ${deltaDir}`);
        let targetFullImageFile = path.join(targetFolder, 'imageFull.tgz');
        let targetDeltaImageFile = path.join(targetFolder, 'image.tgz');
        // Create the docker image with the new runtime
        // TODO! Right now, we assume the image is loaded in docker
        return docker.build(runtimeFolder, targetTag)
            .then(() => {
            // Export the image to a image.tgz file
            console.log("Exporting the image to a image.tgz file...");
            mkdirp.sync(targetFolder);
            return docker.save(targetFullImageFile, targetTag);
        })
            .then(() => {
            let parentTag = createTagFromRuntimeName(manifest.derived.from);
            return docker.areEqual(parentTag, targetTag);
        })
            .then((areEqual) => {
            if (areEqual) {
                return generateDelta(targetFullImageFile, targetDeltaImageFile, deltaDir);
            }
            else {
                return findBaseLayer(manifest.derived.from)
                    .then((baseLayer) => {
                    console.log("BaseLayer: " + baseLayer);
                    return generateDelta(targetFullImageFile, targetDeltaImageFile, deltaDir, baseLayer, versionTag);
                });
            }
        })
            .then(() => {
            return checksumFile(targetDeltaImageFile);
        })
            .then((checksum) => {
            console.log("checksum: " + checksum);
            let manifest = getJSON(manifestPath);
            manifest.code = 'runtimetar';
            let blobManifest = {
                spec: 'http://eslap.cloud/manifest/blob/1_0_0',
                name: 'runtimetar',
                hash: checksum
            };
            return createBundleFile(targetDeltaImageFile, targetFile, manifest, blobManifest);
        })
            .then(() => {
            console.log("Bundle File created.");
            console.log("CleanUp.");
            return cleanUp(targetTag, TMP_PATH);
        })
            .catch((err) => {
            child_process.execSync(`rm -rf ${deltaDir}`);
            return Promise.reject(err);
        });
    }
    catch (error) {
        return Promise.reject(error);
    }
}
exports.bundle = bundle;
function findBaseLayer(parent) {
    console.log("Finding base layer from: " + parent);
    let parsedPath = path.parse(parent);
    let parsedURL = url.parse(parsedPath.dir);
    let runtimeName = parsedURL.hostname + parsedURL.pathname;
    let runtimeVersion = parsedPath.base;
    let runtimeTag = runtimeName + ':' + runtimeVersion;
    let parentTarDir = path.join(TMP_PATH, 'runtime', runtimeName);
    let parentTarPath = path.join(parentTarDir, 'image.tgz');
    try {
        mkdirp.sync(parentTarDir);
        if (process.platform != 'win32') {
            child_process.execSync('set -o errexit; ' +
                'tempDocker=`docker run -d --entrypoint /bin/sh ' + runtimeTag + ' -c "touch /xyz"`; ' +
                'docker commit $tempDocker temp-image; ' +
                'docker save temp-image > ' + parentTarPath + '; ' +
                'docker rmi temp-image; ' +
                'docker rm -f $tempDocker');
        }
        else {
            child_process.execSync('for /f "delims=" %a in (\'docker run -d --entrypoint /bin/sh '
                + parent + ' -c "touch /xyz"\') do ' +
                'docker commit %a temp-image && ' +
                'docker save temp-image > ' + parentTarPath + ' && ' +
                'docker rmi temp-image && ' +
                'docker rm -f %a');
        }
        return extractLastLayerId(parentTarDir);
    }
    catch (err) {
        child_process.execSync(`rm -rf ${parentTarDir}`);
        return Promise.reject('ERROR => findBaseLayer => ' + err);
    }
}
function extractLastLayerId(imageTarDir) {
    console.log("Extracting last layer Id from parent...");
    try {
        let imageTarPath = path.join(imageTarDir, 'image.tgz');
        let tmpDir = path.join(imageTarDir, 'layers');
        mkdirp.sync(tmpDir);
        let repositoriesFile = path.join(tmpDir, 'repositories');
        return untar_(imageTarPath, tmpDir)
            .then(() => {
            let repositories = getJSON(repositoriesFile);
            let layer = repositories[Object.keys(repositories)[0]]['latest'];
            let layerPath = path.join(tmpDir, layer);
            let jsonFromFile = getJSON(`${layerPath}/json`);
            child_process.execSync(`rm -rf ${imageTarDir}`);
            console.log("\tLayer id: " + jsonFromFile.parent);
            return Promise.resolve(jsonFromFile.parent);
        });
    }
    catch (err) {
        child_process.execSync(`rm -rf ${imageTarDir}`);
        return Promise.reject('ERROR => extractLastLayerId => ' + err);
    }
}
function generateDelta(fullImageTar, destFilename, deltaDir, baseLayer, versionTag) {
    console.log("Generating Delta Image...");
    let deltaTmpDir = path.join(deltaDir, 'layers');
    let deltaCopyDir = path.join(deltaDir, 'new');
    let repositoriesFile = path.join(deltaTmpDir, 'repositories');
    try {
        mkdirp.sync(deltaTmpDir);
        mkdirp.sync(deltaCopyDir);
        console.log("\tExtracting full image: " + fullImageTar);
        return untar_(fullImageTar, deltaTmpDir)
            .then(() => {
            if (baseLayer) {
                console.log("\tReading reposirories.");
                let repositories = getJSON(repositoriesFile);
                console.log("\tSearching base layer: ", baseLayer);
                let layer = repositories[Object.keys(repositories)[0]][versionTag];
                return processLayer(layer, baseLayer, deltaTmpDir, deltaCopyDir);
            }
            else {
                return Promise.resolve();
            }
        })
            .then(() => {
            console.log("\tLayer processing finished OK.");
            return ncp_(repositoriesFile, `${deltaCopyDir}/repositories`);
        })
            .then(() => {
            return globCopy_(`${deltaTmpDir}/*.json`, deltaCopyDir);
        })
            .then(() => {
            console.log("\tCreating Docker delta image: " + destFilename);
            return tar_(deltaCopyDir, destFilename);
        })
            .then(() => {
            console.log("\tDelta created.");
            console.log("\tLoading image in local Docker.");
            //child_process.execSync('docker load -i ' + destFilename);
            console.log("\tRemoving temporary files.");
            return Promise.resolve();
        });
    }
    catch (err) {
        child_process.execSync(`rm -rf ${deltaDir}`);
        return Promise.reject('ERROR => generateDelta => ' + err);
    }
}
function processLayer(layer, baseLayer, deltaTmpDir, deltaCopyDir) {
    console.log('\t\tProcessing layer: ', layer);
    try {
        if (layer == baseLayer) {
            console.log('\t\tFound Base image layer: ');
            return Promise.resolve();
        }
        else if (layer == undefined) {
            console.log('\t\tNo base image found.');
            return Promise.reject('No base image found.');
        }
        else {
            let layerPath = path.join(deltaTmpDir, layer);
            return stat(layerPath)
                .then((stats) => {
                if (!stats.isDirectory()) {
                    console.log('\t\tUnknown layer: ${layer}');
                    return Promise.reject(`Unknown layer: ${layer}`);
                }
                else {
                    let copyPath = path.join(deltaCopyDir, layer);
                    console.log('\t\tAdding layer to new image: ' + layer);
                    return ncp_(layerPath, copyPath)
                        .then(() => {
                        let jsonFromFile = getJSON(`${layerPath}/json`);
                        let parentLayer = jsonFromFile.parent;
                        return processLayer(parentLayer, baseLayer, deltaTmpDir, deltaCopyDir);
                    });
                }
            });
        }
    }
    catch (err) {
        return Promise.reject('ERROR => processLayer => ' + err);
    }
}
// Cleans all temporary folder, files and docker images.
function cleanUp(imageId, tmpPath) {
    let promises = [];
    // Delete temporary file
    if (tmpPath && (tmpPath.length > 0)) {
        promises.push(new Promise((resolve, reject) => {
            try {
                if (fs_1.existsSync(tmpPath)) {
                    rmrf(tmpPath, (error) => {
                        if (error) {
                            reject(error);
                        }
                        else {
                            resolve();
                        }
                    });
                }
                else {
                    resolve();
                }
            }
            catch (error) {
                reject(error);
            }
        }));
    }
    // Delete Docker image
    // RADIATUS want its images in local
    // if (imageId && (imageId.length > 0)) {
    //   promises.push(docker.deleteImage(imageId));
    // }
    // Wait for both clean operations
    return Promise.all(promises)
        .then(() => {
        return Promise.resolve();
    });
}
// Creates the bundle file containing the manifest and the Docker runtime image
function createBundleFile(dockerFilePath, targetFilePath, manifest, blobManifest) {
    console.log("Creating Bundle file...");
    return new Promise((resolve, reject) => {
        // Create an archiver and the output stream with the target file
        let archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });
        let output = fs_1.createWriteStream(targetFilePath);
        // listen for all archive data to be written
        // 'close' event is fired only when a file descriptor is involved
        output.on('close', function () {
            // console.log(archive.pointer() + ' total bytes');
            // console.log('archiver has been finalized and the output file descriptor has closed.');
            resolve();
        });
        // This event is fired when the data source is drained no matter what was the data source.
        // It is not part of this library but rather from the NodeJS Stream API.
        // @see: https://nodejs.org/api/stream.html#stream_event_end
        output.on('end', function () {
            // console.log('Data has been drained');
            resolve();
        });
        // Manages warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function (err) {
            reject(err);
            // if (err.code === 'ENOENT') {
            //     // log warning
            //   } else {
            //     // throw error
            // }
        });
        // Manages errors
        archive.on('error', function (err) {
            reject(err);
        });
        // Pipes archive data to the file
        archive.pipe(output);
        // Appends the docker image file from stream
        console.log('\tadded runtime/image.tgz');
        archive.append(fs_1.createReadStream(dockerFilePath), { name: 'runtime/image.tgz' });
        // Appends the manifest file
        console.log('\tadded Manifest.json');
        archive.append(JSON.stringify(manifest, null, 2), { name: 'Manifest.json' });
        // Appends the blobManifest file
        console.log('\tadded runtime/Manifest.json');
        archive.append(JSON.stringify(blobManifest, null, 2), { name: 'runtime/Manifest.json' });
        // Finalize the archive (ie we are done appending files but streams have to
        // finish yet)
        // 'close', 'end' or 'finish' may be fired right after calling this method so
        // register to them beforehand
        archive.finalize();
    });
}
function createTagFromRuntimeName(name) {
    let parsedPath = path.parse(name);
    let parsedURL = url.parse(parsedPath.dir);
    let runtimeName = parsedURL.hostname + parsedURL.pathname;
    let runtimeVersion = parsedPath.base;
    let tag = runtimeName + ':' + runtimeVersion;
    return tag;
}
// function generateURL(urn:string, baseURL:string, filename:string){
//   let parsed = url.parse(urn);
//   let result = path.join(parsed.host, parsed.pathname, '/')
//   if(baseURL != undefined){
//     result = url.resolve(baseURL, result);
//   }
//   if(filename != undefined){
//     result = url.resolve(result, filename);
//   }
//   return result;
// }
// function download(url:string, destinationFile:string):Promise<any>{
//   console.log("Downloading: " + url);
//   return new Promise( (resolve, reject) => {
//     try{
//       let file = fs.createWriteStream(destinationFile);
//       let r = http.get(url, (res) =>{
//         if(res.statusCode == 200){
//           res.pipe(file);
//           file.on('finish', ()=>{
//             file.close();
//           });
//           file.on('close', ()=>{
//             resolve();
//           });
//         }else{
//           fs.unlinkSync(destinationFile);
//           reject('HTTP Error ' + res.statusCode);
//         }
//       })
//       r.on('error', (err)=>{
//         reject('HTTP Error ' + err);
//       });
//     }catch(err){
//       reject(err);
//     }
//   });
// }
//# sourceMappingURL=index.js.map