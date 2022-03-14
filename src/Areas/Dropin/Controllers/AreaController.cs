using Microsoft.AspNetCore.Mvc;
using Weavy.Core.Controllers;
using Weavy.Core.Mvc;

namespace Weavy.Dropin.Controllers;

/// <summary>
/// Abstract base class for controllers in the area.
/// </summary>
[Area(Constants.AREA_NAME)]
[Route("[area]/[controller]")]
[TurboDrive]
public abstract class AreaController : WeavyController {

}
