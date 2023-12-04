using System;
using System.ComponentModel.DataAnnotations.Schema;
using System.Globalization;
using System.Linq;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.TagHelpers;
using Microsoft.AspNetCore.Razor.TagHelpers;
using Microsoft.VisualBasic;
using Weavy.Core;
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
            IHtmlContent avatar = null;

            var user = For switch {
                User u => u,
                PrivateChat chat => chat.User,
                _ => null
            };

            if (user != null) {
                // get avatar for user 
                avatar = GetAvatar(user);

                if (Presence) {
                    // wrap avatar in .wy-avatar-presence with position:relative
                    output.TagName = "div";
                    output.TagMode = TagMode.StartTagAndEndTag;
                    output.AddClass("wy-avatar-presence", HtmlEncoder.Default);
                    output.Content.SetHtmlContent(avatar);

                    // add absolutely positioned presence indicator
                    var indicator = new TagBuilder("div");
                    indicator.Attributes["data-presence-id"] = user.Id.ToString(CultureInfo.InvariantCulture);
                    indicator.AddCssClass("wy-presence");

                    // get presence for user
                    var presence = UserService.GetPresence(user.Id);
                    if (presence.Status == PresenceStatus.Active) {
                        indicator.AddCssClass("wy-presence-active");
                    }
                    output.Content.AppendHtml(indicator);
                    return;
                }
            } else if (For is ChatRoom room && room.Avatar == null) {
                // composite avatar to indicate a chat room
                output.TagName = "div";
                output.TagMode = TagMode.StartTagAndEndTag;
                output.AddClass("wy-avatars", HtmlEncoder.Default);
                output.Attributes.SetAttribute("style", $"width:{Size}px; height:{Size}px");

                var member1 = room.Members.FirstOrDefault(x => x.Id != WeavyContext.Current.User.Id);
                if (member1 != null) {
                    var member2 = room.Members.FirstOrDefault(x => x.Id != member1.Id && x.Id != WeavyContext.Current.User.Id);
                    if (member2 == null) {
                        // current user + other member
                        output.Content.AppendHtml(GetAvatar(room.Member));
                        output.Content.AppendHtml(GetAvatar(member1));
                    } else {
                        // two members that are not current user
                        output.Content.AppendHtml(GetAvatar(member1));
                        output.Content.AppendHtml(GetAvatar(member2));
                    }
                } else {
                    // null + current user
                    output.Content.AppendHtml(GetAvatar(member1));
                    output.Content.AppendHtml(GetAvatar(room.Member));                    
                }
                
                return;
            } else {
                avatar = GetAvatar(For);
            }

            if (avatar is TagBuilder tb) {
                // must be img
                output.TagName = tb.TagName;
                output.TagMode = TagMode.SelfClosing;
                output.MergeAttributes(tb);
                output.Content.SetHtmlContent(tb);
            } else {
                // must be svg initials
                output.TagName = null;
                output.TagMode = TagMode.StartTagAndEndTag;
                output.Content.SetHtmlContent(avatar);
            }
        }
    }


    private IHtmlContent GetAvatar(IHasAvatar hasAvatar) {
        // use avatar image if available
        if (hasAvatar?.Avatar != null) {
            var img = new TagBuilder("img");
            img.AddCssClass("wy-avatar");
            img.Attributes["width"] = img.Attributes["height"] = Size.ToString(CultureInfo.InvariantCulture);
            img.Attributes["src"] = hasAvatar.AvatarUrl(Size);
            img.Attributes["alt"] = "";
            return img;
        }

        // otherwise, fallback to initials (will possibly render circle without initials, which is what we want in case of no avatar image)
        var name = hasAvatar is User u ? u.DisplayName : "";
        return Weavy.Core.Utils.Svg.Initials(name ?? "", size: Size, htmlAttributes: new { @class = "wy-avatar" });
    }
}
