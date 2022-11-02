using System;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Mvc.TagHelpers;
using Microsoft.AspNetCore.Razor.TagHelpers;
using Weavy.Core.Models;
using Weavy.Core.Utils;
using Weavy.Core.TagHelpers;

namespace Weavy.Dropin.TagHelpers;

/// <summary>
/// <see cref="ITagHelper"/> implementation for svg icons.
/// </summary>
[HtmlTargetElement("icon")]
public class IconTagHelper : TagHelper {

    private const string ForAttributeName = "for";
    private const string NameAttributeName = "name";
    private const string ColorAttributeName = "color";
    private const string SizeAttributeName = "size";

    /// <summary>
    /// The file for which to return an icon.</param>
    /// </summary>
    [HtmlAttributeName(ForAttributeName)]
    public Blob For { get; set; }

    /// <summary>
    /// The name of the icon to render.</param>
    /// </summary>
    [HtmlAttributeName(NameAttributeName)]
    public string Name { get; set; }

    /// <summary>
    /// Icon color, e.g. "native", "primary", "error".</param>
    /// </summary>
    [HtmlAttributeName(ColorAttributeName)]
    public string Color { get; set; }

    /// <summary>
    /// Icon size in pixels.
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

        if (For != null) {
            Name = FileUtils.GetIcon(For);
            
            var kind = FileUtils.GetKind(For.Name, For.MediaType);
            output.AddClass("wy-kind-" + kind.ToSpinalCase(), HtmlEncoder.Default);

            var ext = FileUtils.GetExtension(For.Name).RemoveLeading(".");
            if (ext != null && ext.Length != 0) {
                output.AddClass("wy-ext-" + ext.RemoveLeading("."), HtmlEncoder.Default);
            }
        } 

        if (Name != null) {           
            var svg = Weavy.Core.Utils.Svg.Icon(Name, color: Color, size: Size, htmlAttributes: output.GetAttributeDictionary());
            output.TagName = null;
            output.TagMode = TagMode.StartTagAndEndTag;
            output.Content.SetHtmlContent(svg);
        }
    }
}



