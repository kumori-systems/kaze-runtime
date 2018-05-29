## README

This library is a tool that is used by KAZE to generate ready-to-register runtime bundles.
The bundle will be stored in dist/bundle.zip in the runtime folder.

### Build workflow

* If a "pre_build.sh" script exists on the same path as the "Dockerfile", it will be executed before the building.
* The runtime image (RI) is created in the local Docker server by mean of the "Dockerfile".
* The RI now is exported into a temporary file RUNTIME.zip.
* Then the parent runtime is also exported into another file PARENT_RUNTIME.zip.
* The PARENT_RUNTIME.zip is extracted to find out the last ParentlayerId.
* Then all the layerIds on the RUNTIME.zip under the ParentlayerId are removed and we only keep the delta layers.
* It is generated the final bundle.zip on the dist repository which is ready-to-register on ECLOUD.
* If a "post_build.sh" script exists on the same path as the "Dockerfile", it will be executed after the building.

The current version of **kaze-runtime** code has some software dependencies that can not be currently resolved due to restricted access. For this reason, in this version you cannot build **kaze-runtime** from the source code. Nevertheless, in the **dist** folder you will have access to two packaged distributions of **kaze-runtime** ready to be used, one for Linux systems and another for Mac systems. Enjoy yourself!


### Disclaimer

The current version of **kaze-runtime** code has some software dependencies that can not be currently resolved due to restricted access. For this reason, in this version you cannot build **kaze-runtime** from the source code. Nevertheless, in the **dist** folder you will have access to two packaged distributions of **kaze-runtime** ready to be used, one for Linux systems and another for Mac systems.

### Support advice

The **kaze-runtime** software has been developed in the project *SaaSDK: Tools & Services for developing and managing software as a service over a PaaS (SaaSDK: Herramientas y servicios para el desarrollo y gestión de software como servicio sobre un PaaS)* jointly financed by Instituto Valenciano de Competitividad Empresarial (IVACE) and European Union through the European Regional Development Fund with grant number IMDEEA/2017/141.