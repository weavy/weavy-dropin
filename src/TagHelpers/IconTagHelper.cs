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

    /// <summary>
    /// The name of the icon to render.</param>
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
            object attrs = null;
            if (output.Attributes.TryGetAttribute("class", out var css)) {
                attrs = new { @class = css.Value };
            }
            var svg = Weavy.Core.Utils.Svg.Icon(Name, htmlAttributes: attrs);
            output.TagName = null;
            output.TagMode = TagMode.StartTagAndEndTag;
            output.Content.SetHtmlContent(svg);
        }
    }
}



