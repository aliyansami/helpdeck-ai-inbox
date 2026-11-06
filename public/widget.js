// Helpdeck chat widget loader. Embed with: <script src="https://YOUR-HELPDECK/widget.js" async></script>
(function () {
  var script = document.currentScript;
  var origin = new URL(script.src).origin;
  var open = false;

  var frame = document.createElement("iframe");
  frame.src = origin + "/widget";
  frame.title = "Support chat";
  frame.style.cssText = "position:fixed;right:20px;bottom:88px;width:360px;height:520px;max-height:calc(100vh - 120px);border:0;border-radius:12px;box-shadow:0 8px 30px rgba(20,33,61,.18);display:none;z-index:2147483646;background:#fff";

  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Open support chat");
  button.textContent = "Chat";
  button.style.cssText = "position:fixed;right:20px;bottom:20px;height:52px;padding:0 22px;border:0;border-radius:26px;background:#F26B3A;color:#fff;font:700 15px/1 -apple-system,Helvetica,Arial,sans-serif;cursor:pointer;z-index:2147483647";
  button.onclick = function () {
    open = !open;
    frame.style.display = open ? "block" : "none";
    button.textContent = open ? "Close" : "Chat";
  };

  document.body.appendChild(frame);
  document.body.appendChild(button);
})();
