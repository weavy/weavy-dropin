using Microsoft.AspNetCore.Http;
using System;
using Microsoft.AspNetCore.Mvc;
using Weavy.Core.Controllers;
using Weavy.Core.Mvc;
using Weavy.Core.Models;
using Microsoft.AspNetCore.DataProtection;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Abstract base class for controllers in the area.
/// </summary>
[Area(Constants.AREA_NAME)]
[Route("[area]/[controller]")]
[TurboDrive]
public abstract class AreaController : WeavyController {

    /// <summary>
    /// Sets the preferred layout to use when rendering files.
    /// </summary>
    protected void SetLayout(int appId, Layout layout) {
        // store preferred layout in cookie
        Response.Cookies.Append($"{nameof(Layout)}-{appId}", layout.ToString("D"), new CookieOptions {
            Path = "/dropin",
            Expires = DateTime.UtcNow.AddYears(1),
            Secure = true,
            SameSite = SameSiteMode.None
        });
    }

    /// <summary>
    /// Gets the preferred layout to use when rendering files.
    /// </summary>
    protected Layout GetLayout(int appId) {
        if (Request.Cookies.TryGetValue($"{nameof(Layout)}-{appId}", out var s) && Enum.TryParse<Layout>(s, out var e)) {
            return e;
        }
        return Layout.List;
    }
}
