namespace Weavy.Core.Models;

/// <summary>
/// A class representing authentication status after authorization with a meeting provider
/// </summary>
public class MeetingAuthentication {
    /// <summary>
    /// The state parameter sent to meeting provider athentication
    /// </summary>
    public string State { get; set; }

    /// <summary>
    /// Authentication state
    /// </summary>
    public bool Authenticated { get; set; }
}
