using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Localization;
using Weavy.Core.Localization;
using Weavy.Core.Models;
using Weavy.Core.Utils;

namespace Weavy.Dropin.Models;

/// <summary>
/// View model for inserting/editing messages.
/// </summary>
public class MessageModel : IValidatableObject {

    private static readonly IStringLocalizer T = Localizer.For<MessageModel>();

    /// <summary>
    /// Gets or sets the parent entity (app, post, file).
    /// </summary>
    public IEntity Parent { get; set; }

    /// <summary>
    /// The Message itself (when editing existing message).
    /// </summary>
    public Message Message { get; set; }

    /// <summary>
    /// Gets or sets ids of files attached to the <see cref="Message"/>.
    /// </summary>
    public int[] Attachments { get; set; } = Array.Empty<int>();

    /// <summary>
    /// Gets or sets the ids of <see cref="Blob"/>s to attach.
    /// </summary>
    public int[] Blobs { get; set; } = Array.Empty<int>();

    /// <summary>
    /// Gets or sets the id of an <see cref="Embed"/> that should be attached to the message.
    /// </summary>
    public int? EmbedId { get; set; }

    /// <summary>
    /// Gets or sets the id of a <see cref="Meeting"/> that should be attached to the message
    /// </summary>
    public int? MeetingId { get; set; }

    /// <summary>
    /// Gets or sets poll options.
    /// </summary>
    public List<PollOptionModel> Options { get; set; }

    /// <summary>
    /// Gets or sets the message text.
    /// </summary>
    /// 
    public string Text { get; set; }

    /// <summary>
    /// Performs custom validation.
    /// </summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) {
        if (Attachments.IsNullOrEmpty() && Blobs.IsNullOrEmpty() && Options.IsNullOrEmpty() && EmbedId == null && MeetingId == null && string.IsNullOrEmpty(Text)) {
            yield return new ValidationResult(T["Message is empty."], new string[] { nameof(Text) });
        }
    }
}
