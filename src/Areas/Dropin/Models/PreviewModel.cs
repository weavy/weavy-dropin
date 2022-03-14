using Weavy.Core.Models;

namespace Weavy.Dropin.Models;

/// <summary>
/// Model for file previews.
/// </summary>
public class PreviewModel {

    /// <summary>
    /// The current file being previewed.
    /// </summary>
    public File Current { get; set; }

    /// <summary>
    /// The previous sibling of the file being previewed.
    /// </summary>
    public File Prev { get; set; }

    /// <summary>
    /// The next sibling of the file being previewed.
    /// </summary>
    public File Next { get; set; }

}
