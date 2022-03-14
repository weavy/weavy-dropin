# Weavy drop-in UI

A [Razor class library](https://docs.microsoft.com/en-us/aspnet/core/razor-pages/ui-class) (RCL) containing an [ASP.NET Core MVC Area](https://docs.microsoft.com/en-us/aspnet/core/mvc/controllers/areas) with the Weavy drop-in UI.

This class library is not a standalone application, but can be cloned and included as a project reference in the [Weavy Server](https://github.com/weavy/weavy-server) solution for developers wanting to extend and/or modify the default functionality of the Weavy drop-in UI.

## Asset bundling

In addition to the tools required by [Weavy Server](https://github.com/weavy/weavy-server) you will also need to install [Node.js](https://nodejs.org/) in order to compile and bundle assets (css and javascript) for the Weavy drop-in UI. 

The following commands will install dependencies and write asset bundles to the `wwwroot` folder:

1. `npm install`
2. `npm run build`
