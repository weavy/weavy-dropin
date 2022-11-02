using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Razor.TagHelpers;
using Microsoft.IdentityModel.Tokens;

namespace Weavy.Dropin.TagHelpers;

/// <summary>
/// <see cref="ITagHelper"/> implementation for attribute splatting.
/// </summary>
[HtmlTargetElement("*", Attributes = "asp-attributes")]
public class AttributesHelper : TagHelper {

    [HtmlAttributeName("asp-attributes")]
    public Dictionary<string, object> Attributes { get; set; }

    /// <inheritdoc />
    /// <remarks>Does nothing if <see cref="Attributes"/> is <c>null</c>.</remarks>
    public override void Process(TagHelperContext context, TagHelperOutput output) {
        if (context == null) {
            throw new ArgumentNullException(nameof(context));
        }

        if (output == null) {
            throw new ArgumentNullException(nameof(output));
        }


        if (Attributes.IsNullOrEmpty()) {
            return;
        }

        foreach (var attribute in Attributes) {
            // REVIEW: add logic that merges with existing attributes?
            output.Attributes.Add(attribute.Key, attribute.Value);
        }
    }
}



