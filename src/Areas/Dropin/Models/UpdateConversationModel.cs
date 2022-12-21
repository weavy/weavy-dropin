using System;
using System.ComponentModel.DataAnnotations;
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
    [Display(Name = "Conversation name", Description = "Changing the name of a group chat changes it for everyone.")]
    public string Name { get; set; }


}
