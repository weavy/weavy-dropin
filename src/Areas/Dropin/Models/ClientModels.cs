using System.Collections.Generic;
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
    public string Id { get; set; }

    /// <summary>
    ///   Gets or sets the server id for the app in the the host system.
    /// </summary>
    public int AppId { get; set; }

    /// <summary>
    ///   Gets or sets the expected app type (preferably GUID, but name should also work).
    /// </summary>
    public string Type { get; set; }

    /// <summary>
    /// Gets or sets the display name of the app.
    /// </summary>
    public string Name { get; set; }

    /// <summary>
    /// Gets or sets a collection of tags to associate with the app.
    /// </summary>
    public string[] Tags { get; set; }

    /// <summary>
    /// Gets the url to the app.
    /// </summary>
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
    /// Sets plugin options.
    /// </summary>
    public Dictionary<string, dynamic> Plugins { internal get; set; } = new Dictionary<string, dynamic>();

    /// <summary>
    /// Sets the client timezone.
    /// </summary>
    [JsonProperty("tz")]
    public string TimeZone { internal get; set; }

    /// <summary>
    /// Sets the name of the theme to use.
    /// </summary>
    public string Theme { internal get; set; }

    /// <summary>
    /// Sets the client version (used to display warning if client and server versions are different).
    /// </summary>
    public string Version { internal get; set; }
}

/// <summary>
/// Return data when initializing the Weavy UI client library.
/// </summary>
public class ClientOutputModel {

    ///// <summary>
    ///// Gets the available <see cref="App"/> types.
    ///// </summary>
    //public Dictionary<string, Guid> Apps { get; internal set; }

    /// <summary>
    /// Gets the plugin options.
    /// </summary>
    [JsonProperty("plugins")]
    public Dictionary<string, dynamic> Plugins { get; internal set; } = new Dictionary<string, dynamic>();

    /// <summary>
    /// Gets the system status.
    /// </summary>
    public SystemStatus Status => Application.Status;

    /// <summary>
    /// Gets the server version (used to detect if client should be upgraded).
    /// </summary>
    public string Version => Application.SemVer;

}

/// <summary>
/// Jwt model
/// </summary>
public class TokenIn {
    /// <summary>
    /// The token
    /// </summary>
    public string Jwt { get; set; }
}
