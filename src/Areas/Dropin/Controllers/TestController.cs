using Microsoft.AspNetCore.Mvc;

namespace Weavy.Dropin.Controllers;

public class TestController : AreaController {

    [HttpGet("colors")]
    public IActionResult Colors() {
        return View();
    }
}
