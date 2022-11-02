using System.Collections.Generic;
using Weavy.Core.Models;

namespace Weavy.Dropin.Models;

/// <summary>
/// Model for file versions.
/// </summary>
public class VersionsModel {

    /// <summary>
    /// Gets or set the versions for this file.
    /// </summary>
    public IEnumerable<File> Versions { get; set; }

    /// <summary>
    /// Gets or sets the current version.
    /// </summary>
    public File Current { get; set; }


}
