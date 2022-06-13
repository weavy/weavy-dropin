using System;
using Microsoft.AspNetCore.Razor.TagHelpers;
using Weavy.Core.Services;

namespace Weavy.Dropin.TagHelpers;

/// <summary>
/// <see cref="ITagHelper"/> implementation for svg icons.
/// </summary>
[HtmlTargetElement("icon", Attributes = NameAttributeName)]
public class IconTagHelper : TagHelper {

    private const string NameAttributeName = "name";
    private const string ColorAttributeName = "color";
    private const string SizeAttributeName = "size";

    /// <summary>
    /// The name of the icon to return.</param>
    /// </summary>
    [HtmlAttributeName(NameAttributeName)]
    public string Name { get; set; }

    /// <summary>
    /// Gets or sets the icon color.
    /// </summary>
    [HtmlAttributeName(ColorAttributeName)]
    public string Color { get; set; }

    /// <summary>
    /// Gets or sets the icon size.
    /// </summary>
    [HtmlAttributeName(SizeAttributeName)]
    public int Size { get; set; } = 24;

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
            // REVIEW: pass in all attributes and not just class?
            object attrs = null;
            if (output.Attributes.TryGetAttribute("class", out var css)) {
                attrs = new { @class = css.Value };
            }
            var svg = Weavy.Core.Utils.Svg.Icon(Name, size: Size, classname: ConfigurationService.ThemePrefix + "-icon", htmlAttributes: attrs);
            output.TagName = null;
            output.TagMode = TagMode.StartTagAndEndTag;
            output.Content.SetHtmlContent(svg);
        }
    }
}



