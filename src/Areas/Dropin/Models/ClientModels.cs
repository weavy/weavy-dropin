using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;
using Weavy.Core;
using Weavy.Core.Models;

namespace Weavy.Dropin.Models;

/// <summary>
///  Model used when initializing apps from the Weavy UI client library.
/// </summary>
public class InitAppModel {

    /// <summary>
    ///   Gets or sets the unique identifier for the app in the the host system.
    /// </summary>
    public string Uid { get; set; }

    /// <summary>
    ///   Gets or sets the expected app type (preferably GUID, but name also works).
    /// </summary>
    public string Type { get; set; }

    /// <summary>
    /// Gets the url to the app. 
    /// </summary>
    /// <remarks>This property is also used as "base url" for identifying the app in navigation, redirects etc.</remarks>
    public string Url { get; internal set; }
}

/// <summary>
/// Options for initializing the Weavy UI client library.
/// </summary>
public class InitClientModel {

    /// <summary>
    /// Sets language code of preferred language.
    /// </summary>
    [JsonProperty("lang")]
    public string Language { internal get; set; }

    /// <summary>
    /// Sets the client timezone.
    /// </summary>
    [JsonProperty("tz")]
    public string TimeZone { internal get; set; }

    /// <summary>
    /// Sets the client version (used to display warning if client and server versions are different).
    /// </summary>
    public string Version { internal get; set; }
}

/// <summary>
/// Return data when initializing the Weavy UI client library.
/// </summary>
public class ClientOutputModel {

    /// <summary>
    /// Gets the system status.
    /// </summary>
    public static SystemStatus Status => Application.Status;

    /// <summary>
    /// Gets the server version (used to detect if client should be upgraded).
    /// </summary>
    public static string Version => Application.SemVer;

}
