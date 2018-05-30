"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path = require("path");
const fs = require("fs");
var ElementType;
(function (ElementType) {
    ElementType[ElementType["Component"] = 1] = "Component";
    ElementType[ElementType["Service"] = 2] = "Service";
    ElementType[ElementType["Deployment"] = 3] = "Deployment";
    ElementType[ElementType["Runtime"] = 4] = "Runtime";
    ElementType[ElementType["Resource"] = 5] = "Resource";
    ElementType[ElementType["Test"] = 6] = "Test";
})(ElementType = exports.ElementType || (exports.ElementType = {}));
class Workspace {
    constructor(rootPath) {
        this.logger = console;
        this.rootPath = rootPath;
    }
    getRootPath() {
        return this.rootPath;
    }
    getManifest(elemPath) {
        const configPath = path.join(elemPath, 'Manifest.json');
        let data = fs.readFileSync(require.resolve(configPath));
        return JSON.parse(data.toString());
    }
    getElementInfo(type, name, domain) {
        let typePath;
        // Checks the element type
        switch (type) {
            case ElementType.Runtime:
                typePath = 'runtimes';
                break;
            case ElementType.Component:
                typePath = 'components';
                type = ElementType.Component;
                break;
            case ElementType.Service:
                typePath = 'services';
                type = ElementType.Service;
                break;
            case ElementType.Resource:
                typePath = 'resources';
                type = ElementType.Resource;
                break;
            default:
                throw new Error(`Element type "${type}" unknown`);
        }
        // Creates the element path in the workspace
        let pathInWorkspace = `${this.rootPath}/${typePath}/${domain}/${name}`;
        let manifest = this.getManifest(pathInWorkspace);
        let parts = manifest.name.split('/');
        // Checks this path exists in the workspace
        let stats = fs_1.statSync(pathInWorkspace);
        if (stats.isDirectory()) {
            return {
                type: type,
                folder: pathInWorkspace,
                name: name,
                domain: domain,
                version: parts[parts.length - 1]
            };
        }
        // The element has not been found in the workspace
        throw new Error(`Element "${name} not found in workspace"`);
    }
}
exports.Workspace = Workspace;
//# sourceMappingURL=workspace.js.map