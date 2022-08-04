using System;
using Microsoft.AspNetCore.Razor.TagHelpers;
using Weavy.Core.Services;
using Weavy.Core.Utils;

namespace Weavy.Dropin.TagHelpers;

/// <summary>
/// <see cref="ITagHelper"/> implementation for emoji images.
/// </summary>
[HtmlTargetElement("emoji", Attributes = NameAttributeName)]
public class EmojiTagHelper : TagHelper {

    private const string NameAttributeName = "name";

    /// <summary>
    /// The short name, ascii or unicode character of the emoji to return.</param>
    /// </summary>
    [HtmlAttributeName(NameAttributeName)]
    public string Name { get; set; }

    /// <inheritdoc />
    /// <remarks>Does nothing if <see cref="Name"/> is <c>null</c>.</remarks>
    public override void Process(TagHelperContext context, TagHelperOutput output) {
        if (context == null) {
            throw new ArgumentNullException(nameof(context));
        }

        if (output == null) {
            throw new ArgumentNullException(nameof(output));
        }

        if (Name != null) {
            var img = Emojione.ToImage(Name, ascii: true);
            output.TagName = null;
            output.TagMode = TagMode.StartTagOnly;
            output.Content.SetHtmlContent(img);
        }
    }
}



