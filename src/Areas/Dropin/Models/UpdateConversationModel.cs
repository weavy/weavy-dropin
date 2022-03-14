using System;
using Weavy.Core.Models;

namespace Weavy.Dropin.Models;

/// <summary>
/// Model for updating a conversation.
/// </summary>
public class UpdateConversationModel {

    /// <summary>
    /// Gets or sets the conversation.
    /// </summary>
    public Conversation Conversation { get; set; }

    /// <summary>
    /// Gets or sets the name of the room.
    /// </summary>
    public string Name { get; set; }

    /// <summary>
    /// Gets or sets the user ids.
    /// </summary>
    public int[] Users { get; set; } = Array.Empty<int>();

}
