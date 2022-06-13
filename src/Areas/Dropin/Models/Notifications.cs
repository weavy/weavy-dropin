using System;
using System.Runtime.InteropServices;

namespace Weavy.Core.Models;

/// <summary>
/// A view component for displaying notifications.
/// </summary>
public class Notifications {

    /// <summary>
    /// Gets or sets the notifications to display.
    /// </summary>
    public NotificationSearchResult Items { get; set; }
}
