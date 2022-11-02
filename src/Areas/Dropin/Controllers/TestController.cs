using Microsoft.AspNetCore.Mvc;
using Weavy.Core.Models;
using Weavy.Core.Utils;

namespace Weavy.Dropin.Controllers;

public class TestController : AreaController {

    [HttpGet]
    [Route("")]
    public IActionResult Index() {
        return View();
    }


    [HttpGet]
    [Route("theme")]
    public IActionResult Theme([FromQuery] string color = "00658e") {
        var argb = ColorUtils.ArgbFromHex("#" + color);
        var theme = new Theme(argb);
        return View(theme);
    }


}
