# Weavy 10.0.4 (2022-04-27)

* Added support for OpenID Connect Discovery when JWT issuer does not contain scheme/protocol, e.g. accounts.google.com.

# Weavy 10.0.3 (2022-04-08)

* Fixed stylesheet loading in dropin-js when using style-nodes in Firefox and Safari. 

# Weavy 10.0.2 (2022-04-06)

* Fixed stylesheet loading error in dropin-js when using CORS. 

# Weavy 10.0.1 (2022-03-18)

New major release of Weavy where the backend has been ported from .NET Framework to .NET Core. 

This release only contains the Messenger app. Other apps and features will arrive in future releases.

Upgrading from previous versions of Weavy is not yet supported.

## Weavy backend

The Weavy backend code has been ported to .NET Core. We still uses some APIs that are only available on Windows but cross-platform support is in progress.

## Weavy drop-in UI

The drop-in UI has been rewritten and is published to npmjs.org for easier installation and integration.
