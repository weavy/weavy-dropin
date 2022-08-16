using Microsoft.AspNetCore.Mvc;

namespace Weavy.Dropin.Controllers;

public class TestController : AreaController {

    [HttpGet]
    [Route("")]
    public IActionResult Index() {
        return View();
    }

}
