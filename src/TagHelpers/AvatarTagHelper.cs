using System;
using System.Globalization;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.TagHelpers;
using Microsoft.AspNetCore.Razor.TagHelpers;
using Weavy.Core.Models;
using Weavy.Core.Services;
using Weavy.Core.Utils;

namespace Weavy.Dropin.TagHelpers;

/// <summary>
/// <see cref="ITagHelper"/> implementation for avatar images.
/// </summary>
[HtmlTargetElement("avatar", Attributes = ForAttributeName)]
public class AvatarTagHelper : TagHelper {

    private const string ForAttributeName = "for";
    private const string SizeAttributeName = "size";
    private const string PresenceAttributeName = "presence";

    /// <summary>
    /// The object for which to return an avatar image.</param>
    /// </summary>
    [HtmlAttributeName(ForAttributeName)]
    public IHasAvatar For { get; set; }

    /// <summary>
    /// Gets or sets a value indicating the size of the avatar in pixels.
    /// </summary>
    [HtmlAttributeName(SizeAttributeName)]
    public int Size { get; set; } = 32;

    /// <summary>
    /// Gets or sets a value indicating if presence tracking should be active.
    /// </summary>
    [HtmlAttributeName(PresenceAttributeName)]
    public bool Presence { get; set; }

    /// <inheritdoc />
    /// <remarks>Does nothing if <see cref="For"/> is <c>null</c>.</remarks>
    public override void Process(TagHelperContext context, TagHelperOutput output) {
        if (context == null) {
            throw new ArgumentNullException(nameof(context));
        }

        if (output == null) {
            throw new ArgumentNullException(nameof(output));
        }

        if (For != null) {
            // create avatar image
            var img = new TagBuilder("img");
            img.Attributes["alt"] = "";
            img.Attributes["src"] = For.AvatarUrl(Size);
            img.Attributes["width"] = img.Attributes["height"] = Size.ToString(CultureInfo.InvariantCulture);
            img.AddCssClass("wy-avatar");

            if (Presence) {
                var userId = For is User user ? user.Id : For is PrivateChat chat ? chat.User?.Id : null;
                if (userId != null) {
                    var presence = UserService.GetPresence(userId.Value);

                    // wrap img in element with position:relative
                    var div = new TagBuilder("div");
                    div.AddCssClass("wy-avatar-presence");
                    output.TagName = div.TagName;
                    output.TagMode = TagMode.StartTagAndEndTag;
                    output.MergeAttributes(div);
                    output.Content.SetHtmlContent(img);

                    // add absolutely positioned presence indicator
                    var indicator = new TagBuilder("div");
                    indicator.Attributes["data-presence-id"] = userId.Value.ToString(CultureInfo.InvariantCulture);
                    indicator.AddCssClass("wy-presence");
                    if (presence.Status == PresenceStatus.Active) {
                        indicator.AddCssClass("wy-presence-active");
                    }
                    output.Content.AppendHtml(indicator);

                    return;
                }
            }
            output.TagName = img.TagName;
            output.MergeAttributes(img);
        }
    }
}
