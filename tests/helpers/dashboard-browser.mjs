import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};

export async function runDashboardBrowserChecks({
  origin,
  username,
  password,
  cache,
  proxySecret,
  certificateSpki,
  smokeOnly = false,
  development = false,
  report,
}) {
  const candidates = [
    process.env.ADMIN_TEST_BROWSER_PATH,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
  ].filter(Boolean);
  let executable;
  for (const candidate of candidates) {
    try {
      await access(candidate);
      executable = candidate;
      break;
    } catch {}
  }
  if (!executable)
    return {
      skipped:
        "No local Chromium browser found. Set ADMIN_TEST_BROWSER_PATH to enable browser checks.",
    };
  const profile = path.join(cache, `browser-${randomUUID()}`);
  await mkdir(profile, { recursive: true });
  const browser = spawn(
    executable,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--remote-debugging-port=0",
      ...(certificateSpki ? [`--ignore-certificate-errors-spki-list=${certificateSpki}`] : []),
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { windowsHide: true, stdio: "ignore" },
  );
  let socket;
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      try {
        port = (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0];
        break;
      } catch {
        await pause(100);
      }
    }
    ensure(port, "The headless browser did not become ready.");
    const target = await (
      await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })
    ).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });
    const pending = new Map();
    let sequence = 0;
    const browserProblems = [];
    let hmrConnected = false;
    let probingInlineScript = false;
    socket.onmessage = async (event) => {
      const response = JSON.parse(event.data);
      if (
        response.method === "Network.webSocketHandshakeResponseReceived" &&
        response.params.response.status === 101
      )
        hmrConnected = true;
      if (response.method === "Fetch.requestPaused") {
        const paused = response.params;
        const body = await command("Fetch.getResponseBody", { requestId: paused.requestId });
        const source = body.base64Encoded
          ? Buffer.from(body.body, "base64").toString("utf8")
          : body.body;
        const policy = paused.responseHeaders.find(
          (header) => header.name.toLowerCase() === "content-security-policy",
        )?.value;
        const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
        const probe = `<script nonce="${nonce}">window.__cspViolations=[];document.addEventListener('securitypolicyviolation',function(event){window.__cspViolations.push(event.violatedDirective)})</script><script>window.__cspInjected=true</script>`;
        await command("Fetch.fulfillRequest", {
          requestId: paused.requestId,
          responseCode: paused.responseStatusCode,
          responseHeaders: paused.responseHeaders.filter(
            (header) => !["content-length", "content-encoding"].includes(header.name.toLowerCase()),
          ),
          body: Buffer.from(source.replace("<head>", `<head>${probe}`)).toString("base64"),
        });
        return;
      }
      if (response.method === "Runtime.exceptionThrown")
        browserProblems.push("uncaught JavaScript exception");
      if (
        response.method === "Runtime.consoleAPICalled" &&
        ["error", "warning"].includes(response.params.type)
      ) {
        const message = response.params.args
          .filter((argument) => typeof argument.value === "string")
          .map((argument) => argument.value)
          .join(" ")
          .slice(0, 500);
        browserProblems.push(
          `console ${response.params.type}: ${message.replaceAll(password, "[redacted]")}`,
        );
      }
      if (
        response.method === "Log.entryAdded" &&
        response.params.entry.level === "error" &&
        !probingInlineScript &&
        !response.params.entry.text.includes("401")
      )
        browserProblems.push(
          `browser ${response.params.entry.source}: ${response.params.entry.text.slice(0, 250)}`,
        );
      if (!response.id || !pending.has(response.id)) return;
      const { resolve, reject, timer } = pending.get(response.id);
      clearTimeout(timer);
      pending.delete(response.id);
      if (response.error) reject(new Error("A browser command failed."));
      else resolve(response.result);
    };
    const command = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error("A browser command timed out."));
        }, 25_000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expression) => {
      const response = await command("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true,
        allowUnsafeEvalBlockedByCSP: false,
      });
      ensure(!response.exceptionDetails, "A browser evaluation failed.");
      return response.result?.value;
    };
    const waitFor = async (expression, description) => {
      for (let i = 0; i < 180; i++) {
        if (await evaluate(expression)) return;
        await pause(100);
      }
      throw new Error(`Browser timed out waiting for ${description}.`);
    };
    const click = async (selector) =>
      ensure(
        await evaluate(
          `(() => {const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return false; element.click(); return true;})()`,
        ),
        "The requested browser control was unavailable.",
      );
    const clickText = async (text, scope = "document") =>
      ensure(
        await evaluate(
          `(() => {const element = [...${scope}.querySelectorAll('button')].find(button => button.textContent.trim() === ${JSON.stringify(text)}); if (!element || element.disabled) return false; element.click(); return true;})()`,
        ),
        `The “${text}” control was unavailable.`,
      );
    const setInput = async (selector, value) =>
      evaluate(
        `(() => {const element = document.querySelector(${JSON.stringify(selector)}); if (!element) return false; const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', {bubbles:true})); element.dispatchEvent(new Event('change', {bubbles:true})); return true;})()`,
      );
    const navigate = async (route) => {
      await command("Page.navigate", { url: new URL(route, origin).href });
      await waitFor(
        `location.pathname === ${JSON.stringify(new URL(route, origin).pathname)} && !!document.querySelector('.rr-admin') && Object.keys(document.querySelector('.admin-mobile-menu') || {}).some(key => key.startsWith('__reactProps'))`,
        "the admin page to hydrate",
      );
    };
    const upload = async (selector, filename) => {
      const root = await command("DOM.getDocument");
      const input = await command("DOM.querySelector", { nodeId: root.root.nodeId, selector });
      ensure(input.nodeId, "The browser upload input was unavailable.");
      await command("DOM.setFileInputFiles", {
        nodeId: input.nodeId,
        files: [path.join(cache, filename)],
      });
    };
    const getBackground = () =>
      evaluate(
        "fetch('/api/admin/sections/slides?view=background', {cache:'no-store'}).then(response => response.json()).then(data => data.background)",
      );
    const screenshot = async (name) => {
      const output = await command("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
        fromSurface: true,
      });
      await writeFile(path.join(cache, name), Buffer.from(output.data, "base64"));
    };
    await command("Network.enable");
    await command("Runtime.enable");
    await command("Log.enable");
    if (development) {
      // Headless profiles cannot answer the normal loopback-network permission prompt.
      // Grant it only to this isolated local development origin; CSP stays enforced.
      const protocol = await (await fetch(`http://127.0.0.1:${port}/json/protocol`)).json();
      const supported =
        protocol.domains
          .find((domain) => domain.domain === "Browser")
          ?.types.find((type) => type.id === "PermissionType")?.enum || [];
      const permissions = ["localNetworkAccess", "localNetwork", "loopbackNetwork"].filter(
        (permission) => supported.includes(permission),
      );
      if (permissions.length) await command("Browser.grantPermissions", { origin, permissions });
    }
    if (proxySecret)
      await command("Network.setExtraHTTPHeaders", {
        headers: { "x-red-rose-proxy-secret": proxySecret, "x-real-ip": "192.0.2.150" },
      });
    for (const [width, height] of [
      [1440, 900],
      [1366, 768],
      [390, 844],
      [320, 740],
    ]) {
      await command("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 600,
      });
      await command("Page.navigate", { url: `${origin}/` });
      await waitFor(
        "!!document.querySelector('[aria-label=\"Next school photo\"]') && !!document.querySelector('.rr-footer-credit')",
        "the public homepage",
      );
      await waitFor(
        "document.readyState === 'complete' && !!document.documentElement.style.getPropertyValue('--rr-header-height')",
        "homepage hydration and measured navigation",
      );
      await pause(400);
      ensure(
        await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),
        `The homepage overflowed at width ${width}.`,
      );
      const fold = await evaluate(
        "({height:innerHeight, header:document.querySelector('.rr-header').getBoundingClientRect().height, hero:document.querySelector('.rr-hero').getBoundingClientRect().height})",
      );
      ensure(
        Math.abs(fold.header + fold.hero - fold.height * 0.9) < 3,
        `Homepage fold dimensions at width ${width}: ${JSON.stringify(fold)}`,
      );
      ensure(
        await evaluate(
          "document.querySelector('.rr-footer-credit').textContent === 'Design by Apex@aspire Digicom solution'",
        ),
        "The footer credit changed.",
      );
    }
    const routes = [
      "/gallery",
      "/circulars",
      "/pages/about-us",
      "/pages/aims-of-objectives",
      "/pages/contact-us",
      "/pages/facilities",
      "/pages/mandatory-disclosure",
      "/pages/fee-structure",
      "/pages/tc-format",
      "/pages/message-from-md",
      "/pages/message-from-principal",
      "/pages/message-from-vice_principal",
    ];
    for (const route of routes) {
      await command("Page.navigate", { url: `${origin}${route}` });
      await waitFor(
        `location.pathname === ${JSON.stringify(route)} && !!document.querySelector('h1') && !!document.querySelector('.rr-footer-credit')`,
        "a public page",
      );
      ensure(
        await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),
        `Public page overflow: ${route}`,
      );
      ensure(
        await evaluate("[...document.images].every(image => image.hasAttribute('alt'))"),
        "A public image has no alt attribute.",
      );
    }
    ensure(browserProblems.length === 0, `Public browser errors: ${browserProblems.join(", ")}`);
    const blockedEval = await command("Runtime.evaluate", {
      expression: "eval('1 + 1')",
      allowUnsafeEvalBlockedByCSP: false,
      returnByValue: true,
    });
    ensure(
      !!blockedEval.exceptionDetails === !development,
      "The environment-specific eval policy failed.",
    );
    // Modify only this browser's response, so the injected script is parsed by the
    // browser normally. DevTools-created script nodes can carry debugger privileges.
    probingInlineScript = true;
    await command("Fetch.enable", {
      patterns: [
        {
          urlPattern: `${origin}/?csp-probe=1`,
          resourceType: "Document",
          requestStage: "Response",
        },
      ],
    });
    await command("Page.navigate", { url: `${origin}/?csp-probe=1` });
    await waitFor(
      "Array.isArray(window.__cspViolations) && !!document.querySelector('.rr-footer-credit')",
      "the CSP probe document",
    );
    await pause(300);
    ensure(
      await evaluate(
        "window.__cspInjected !== true && window.__cspViolations.some(value => value.startsWith('script-src'))",
      ),
      "Production CSP allowed an untrusted inline script.",
    );
    await command("Fetch.disable");
    probingInlineScript = false;
    report(
      `Browser: public pages, four homepage sizes, image alt attributes and ${development ? "development" : "production"} CSP passed.`,
    );
    await command("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1040,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await command("Page.navigate", { url: `${origin}/admin/login` });
    await waitFor(
      "!!document.querySelector('form') && Object.keys(document.querySelector('form')).some(key => key.startsWith('__reactProps'))",
      "the login form",
    );
    await setInput('[name="username"]', username);
    await setInput('[name="password"]', password);
    await evaluate("document.querySelector('form').requestSubmit(); true");
    await waitFor(
      "location.pathname === '/admin/dashboard' && !!document.querySelector('.admin-stat')",
      "authenticated dashboard navigation",
    );
    await waitFor(
      "!!document.querySelector('.admin-hero-card-image img') && document.querySelector('.admin-hero-card-image img').complete && document.querySelector('.admin-hero-card-image img').naturalWidth > 0",
      "the current dashboard photograph",
    );
    ensure(
      await evaluate(
        "!Object.keys(localStorage).some(key => /token|jwt|auth|session/i.test(key)) && document.cookie.indexOf('red-rose-admin=') < 0",
      ),
      "Authentication data was accessible to browser JavaScript.",
    );
    ensure(
      await evaluate("document.querySelectorAll('.admin-sidebar nav a').length === 7"),
      "The admin sidebar did not contain all seven supported sections.",
    );
    ensure(
      await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),
      "The desktop dashboard overflowed horizontally.",
    );
    await screenshot("dashboard-desktop.png");
    report("Browser: authenticated dashboard, real counts, sidebar and desktop layout passed.");
    if (smokeOnly) {
      if (development) ensure(hmrConnected, "The development HMR WebSocket did not connect.");
      ensure(
        (await evaluate(
          "fetch('/api/admin/logout', {method:'POST'}).then(response => response.status)",
        )) === 200,
        "HTTPS browser logout failed.",
      );
      ensure(
        (await evaluate("fetch('/api/admin/content').then(response => response.status)")) === 401,
        "HTTPS browser logout did not revoke access.",
      );
      ensure(browserProblems.length === 0, `HTTPS browser errors: ${browserProblems.join(", ")}`);
      return { skipped: false };
    }

    await click('.admin-sidebar a[href="/admin/background"]');
    await waitFor(
      "location.pathname === '/admin/background' && !!document.querySelector('img[alt=\"Current homepage background\"]')",
      "Homepage Background",
    );
    const initial = await getBackground();
    await upload('input[aria-label="Replace Background Image"]', "invalid.svg");
    await waitFor(
      "!!document.querySelector('[role=alert]') && document.querySelector('[role=alert]').textContent.includes('JPEG')",
      "invalid file type validation",
    );
    await upload('input[aria-label="Replace Background Image"]', "oversize.png");
    await waitFor(
      "!!document.querySelector('[role=alert]') && document.querySelector('[role=alert]').textContent.includes('20 MB')",
      "file size validation",
    );
    await upload('input[aria-label="Replace Background Image"]', "test-background.png");
    await waitFor(
      "!!document.querySelector('img[alt=\"New homepage background preview\"]') && document.querySelector('.admin-file-details')?.textContent.includes('4096')",
      "the 4K image preview and dimensions",
    );
    ensure(
      (await getBackground()).src === initial.src,
      "Selecting an image changed the published photograph before saving.",
    );
    await clickText("Cancel", "document.querySelector('.admin-background-savebar')");
    await waitFor(
      "!!document.querySelector('img[alt=\"Current homepage background\"]')",
      "cancel to restore the original preview",
    );
    ensure((await getBackground()).src === initial.src, "Cancel changed the published photograph.");
    const imageBytes = (await readFile(path.join(cache, "test-background.png"))).toString("base64");
    await evaluate(
      `(() => {const bytes = Uint8Array.from(atob(${JSON.stringify(imageBytes)}), character => character.charCodeAt(0)); const data = new DataTransfer(); data.items.add(new File([bytes], 'dragged-school-photo.png', {type:'image/png'})); document.querySelector('.admin-dropzone').dispatchEvent(new DragEvent('drop', {bubbles:true, cancelable:true, dataTransfer:data})); return true;})()`,
    );
    await waitFor(
      "!!document.querySelector('img[alt=\"New homepage background preview\"]')",
      "the drag-and-drop replacement preview",
    );
    await clickText("Left", "document.querySelector('.admin-position-options')");
    await screenshot("background-preview-desktop.png");
    await clickText("Save Changes", "document.querySelector('.admin-background-savebar')");
    await waitFor(
      "!!document.querySelector('[role=status]') && document.querySelector('[role=status]').textContent.includes('Homepage background saved')",
      "background save confirmation",
    );
    const saved = await getBackground();
    ensure(
      saved.src !== initial.src && saved.position === "left",
      "Background save did not publish the selected image and position.",
    );
    await command("Page.navigate", { url: `${origin}/` });
    await waitFor(
      "!!document.querySelector('[data-cms-managed=\"homepage-background\"]') && !!document.querySelector('[aria-label=\"Show photo 1\"]')",
      "the public homepage carousel",
    );
    await click('[aria-label="Show photo 1"]');
    await waitFor(
      `document.querySelector('[data-cms-managed="homepage-background"]')?.getAttribute('src').includes(${JSON.stringify(encodeURIComponent(saved.src))})`,
      "the published background on the public homepage",
    );
    const publishedPosition = await evaluate(
      "getComputedStyle(document.querySelector('[data-cms-managed=\"homepage-background\"]')).objectPosition",
    );
    ensure(
      publishedPosition === "left" ||
        publishedPosition.startsWith("0% ") ||
        publishedPosition.startsWith("left "),
      "The public homepage did not use the saved image position.",
    );
    await click('[aria-label="Next school photo"]');
    await waitFor(
      "document.querySelector('[aria-label=\"Show photo 2\"]')?.getAttribute('aria-current') === 'true'",
      "the next carousel photo",
    );
    await click('[aria-label="Previous school photo"]');
    await waitFor(
      "document.querySelector('[aria-label=\"Show photo 1\"]')?.getAttribute('aria-current') === 'true'",
      "the previous carousel photo",
    );
    await navigate("/admin/background");
    await clickText("Restore Previous Image");
    await waitFor("document.querySelector('.admin-confirm')?.open", "restore confirmation");
    await clickText("Restore Image", "document.querySelector('.admin-confirm')");
    await waitFor(
      "!!document.querySelector('[role=status]') && document.querySelector('[role=status]').textContent.includes('Previous background restored')",
      "restore completion",
    );
    const restored = await getBackground();
    ensure(
      restored.src === initial.src && restored.position === initial.position,
      "Restore did not return to the prior image and position.",
    );
    report(
      "Browser: current image, invalid/oversized files, 4K preview, cancel, save, public rendering, positioning, carousel and restore passed.",
    );

    await navigate("/admin/editor");
    await waitFor(
      "document.querySelectorAll('.admin-editor-field').length > 5",
      "editable page fields",
    );
    await evaluate(
      "[...document.querySelectorAll('.admin-editor-field')].find(button => button.querySelector('strong')?.textContent === 'Page title').click(); true",
    );
    await waitFor(
      "!!document.querySelector('.admin-editor-edit textarea')",
      "a labelled text editor",
    );
    ensure(
      !(await evaluate(
        "document.querySelector('.admin-editor-edit').textContent.includes('page:/:t:')",
      )),
      "Internal field keys were exposed to staff.",
    );
    const wording = await evaluate("document.querySelector('.admin-editor-edit textarea').value");
    await setInput(".admin-editor-edit textarea", `${wording} Verification`);
    await clickText("Cancel", "document.querySelector('.admin-editor-edit')");
    ensure(
      await evaluate(
        `document.querySelector('.admin-editor-edit textarea').value === ${JSON.stringify(wording)}`,
      ),
      "Text cancel did not discard the draft.",
    );
    await setInput(".admin-editor-edit textarea", `${wording} Verification`);
    await clickText("Save Changes", "document.querySelector('.admin-editor-edit')");
    await waitFor(
      "!!document.querySelector('[role=status]') && document.querySelector('[role=status]').textContent.includes('Saved.')",
      "text save confirmation",
    );
    await waitFor(
      "document.querySelector('iframe').contentDocument.body.textContent.includes('Verification')",
      "saved text in the page preview",
    );
    await clickText("Restore original content");
    await waitFor("document.querySelector('.admin-confirm')?.open", "content restore confirmation");
    await clickText("Restore Original", "document.querySelector('.admin-confirm')");
    await waitFor(
      "!!document.querySelector('[role=status]') && document.querySelector('[role=status]').textContent.includes('Original content restored')",
      "original text restoration",
    );
    await setInput('select[aria-label="Content section"]', "Page images");
    await waitFor(
      "document.querySelectorAll('.admin-editor-field').length > 0",
      "editable page photographs",
    );
    await click(".admin-editor-field");
    await waitFor(
      "!!document.querySelector('input[aria-label=\"Replace Image\"]')",
      "the image editor",
    );
    await upload('input[aria-label="Replace Image"]', "test-background.png");
    await waitFor(
      "document.querySelector('.admin-editor-image img')?.src.startsWith('blob:')",
      "the staged content image preview",
    );
    await clickText("Cancel", "document.querySelector('.admin-editor-edit')");
    ensure(
      !(await evaluate(
        "document.querySelector('.admin-editor-image img')?.src.startsWith('blob:')",
      )),
      "Image cancel left an unsaved preview selected.",
    );
    await upload('input[aria-label="Replace Image"]', "test-background.png");
    await waitFor(
      "document.querySelector('.admin-editor-image img')?.src.startsWith('blob:')",
      "a content image ready to save",
    );
    await clickText("Save Changes", "document.querySelector('.admin-editor-edit')");
    await waitFor(
      "!!document.querySelector('[role=status]') && document.querySelector('[role=status]').textContent.includes('Saved.')",
      "content image save confirmation",
    );
    await waitFor(
      "!document.querySelector('.admin-editor-image img')?.src.startsWith('blob:')",
      "the permanent saved image preview",
    );
    await clickText("Restore original content");
    await waitFor("document.querySelector('.admin-confirm')?.open", "image restore confirmation");
    await clickText("Restore Original", "document.querySelector('.admin-confirm')");
    await waitFor(
      "!!document.querySelector('[role=status]') && document.querySelector('[role=status]').textContent.includes('Original content restored')",
      "original image restoration",
    );
    report(
      "Browser: content grouping, friendly labels and text/image preview, cancel, save and restore passed.",
    );

    const documentTitle = `Browser document ${randomUUID().slice(0, 8)}`;
    await navigate("/admin/documents");
    await setInput('aside form input[name="title"]', documentTitle);
    await upload('aside input[name="files"]', "test-document.pdf");
    await evaluate("document.querySelector('aside form').requestSubmit(); true");
    await waitFor(
      `!!document.querySelector('button[aria-label=${JSON.stringify(`Edit ${documentTitle}`)}]')`,
      "document publication through the form",
    );
    await click(`button[aria-label=${JSON.stringify(`Preview ${documentTitle}`)}]`);
    await waitFor("!!document.querySelector('iframe[title^=\"Preview:\"]')", "the PDF preview");
    await click(`button[aria-label=${JSON.stringify(`Edit ${documentTitle}`)}]`);
    await setInput('[aria-label="New document title"]', `${documentTitle} updated`);
    await evaluate(
      "document.querySelector('input[aria-label=\"New document title\"]').closest('form').requestSubmit(); true",
    );
    await waitFor(
      `!!document.querySelector('button[aria-label=${JSON.stringify(`Delete ${documentTitle} updated`)}]')`,
      "the edited document title",
    );
    ensure(
      await evaluate(
        `!!document.querySelector('iframe[title=${JSON.stringify(`Preview: ${documentTitle} updated`)}]')`,
      ),
      "The open PDF preview did not reflect the updated document title.",
    );
    await upload(
      `input[aria-label=${JSON.stringify(`Replace ${documentTitle} updated`)}]`,
      "test-document.pdf",
    );
    await waitFor(
      "!!document.querySelector('[role=status]') && document.querySelector('[role=status]').textContent.includes('File replaced')",
      "the document replacement",
    );
    await click(`button[aria-label=${JSON.stringify(`Delete ${documentTitle} updated`)}]`);
    await waitFor(
      "document.querySelector('.admin-confirm')?.open",
      "document deletion confirmation",
    );
    await clickText("Cancel", "document.querySelector('.admin-confirm')");
    ensure(
      await evaluate(
        `!!document.querySelector('button[aria-label=${JSON.stringify(`Delete ${documentTitle} updated`)}]')`,
      ),
      "Cancelling deletion removed the document.",
    );
    await click(`button[aria-label=${JSON.stringify(`Delete ${documentTitle} updated`)}]`);
    await waitFor(
      "document.querySelector('.admin-confirm')?.open",
      "document deletion confirmation",
    );
    await clickText("Delete", "document.querySelector('.admin-confirm')");
    await waitFor(
      `!document.querySelector('button[aria-label=${JSON.stringify(`Delete ${documentTitle} updated`)}]') && !document.querySelector('.admin-confirm')`,
      "document removal",
    );

    const circularTitle = `Browser circular ${randomUUID().slice(0, 8)}`;
    await navigate("/admin/circulars");
    await setInput('form input[name="title"]', circularTitle);
    await setInput('form textarea[name="description"]', "A temporary verification notice.");
    await upload('input[name="file"]', "test-document.pdf");
    await evaluate("document.querySelector('form').requestSubmit(); true");
    await waitFor(
      `!!document.querySelector('button[aria-label=${JSON.stringify(`Edit ${circularTitle}`)}]')`,
      "circular publication through the form",
    );
    await click(`button[aria-label=${JSON.stringify(`Edit ${circularTitle}`)}]`);
    await waitFor(
      `document.querySelector('input[name="title"]')?.value === ${JSON.stringify(circularTitle)}`,
      "the circular edit form",
    );
    await setInput('form input[name="title"]', `${circularTitle} updated`);
    await evaluate("document.querySelector('form').requestSubmit(); true");
    await waitFor(
      `!!document.querySelector('button[aria-label=${JSON.stringify(`Delete ${circularTitle} updated`)}]')`,
      "the edited circular",
    );
    await click(`button[aria-label=${JSON.stringify(`Delete ${circularTitle} updated`)}]`);
    await waitFor(
      "document.querySelector('.admin-confirm')?.open",
      "circular deletion confirmation",
    );
    await clickText("Delete", "document.querySelector('.admin-confirm')");
    await waitFor("!document.querySelector('.admin-confirm')", "circular deletion");

    const eventTitle = `Browser event ${randomUUID().slice(0, 8)}`;
    await navigate("/admin/sections?tab=events");
    const setSectionField = (label, value) =>
      evaluate(
        `(() => {const label = [...document.querySelectorAll('.admin-form-panel label.admin-field')].find(element => element.firstChild?.textContent.trim() === ${JSON.stringify(label)}); const input = label?.querySelector('input,textarea'); if (!input) return false; const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); return true;})()`,
      );
    ensure(await setSectionField("Title", eventTitle), "The event title field was unavailable.");
    ensure(
      await setSectionField("Category", "School life"),
      "The event category field was unavailable.",
    );
    ensure(
      await setSectionField("Description", "Temporary browser verification."),
      "The event description field was unavailable.",
    );
    await upload('input[aria-label="Choose Image"]', "test-background.png");
    await waitFor("!!document.querySelector('.admin-file-details')", "the event image preview");
    await evaluate("document.querySelector('.admin-form-panel form').requestSubmit(); true");
    await waitFor(
      `!!document.querySelector('button[aria-label=${JSON.stringify(`Delete ${eventTitle}`)}]')`,
      "event publication through the form",
    );
    await click('.admin-form-panel input[type="checkbox"]');
    await evaluate("document.querySelector('.admin-form-panel form').requestSubmit(); true");
    await waitFor(
      `document.querySelector('button[aria-label=${JSON.stringify(`Delete ${eventTitle}`)}]')?.closest('article').textContent.includes('Hidden')`,
      "the event publication toggle",
    );
    await click(`button[aria-label=${JSON.stringify(`Delete ${eventTitle}`)}]`);
    await waitFor("document.querySelector('.admin-confirm')?.open", "event deletion confirmation");
    await clickText("Delete", "document.querySelector('.admin-confirm')");
    await waitFor("!document.querySelector('.admin-confirm')", "event deletion");
    report(
      "Browser: document upload/PDF preview/title edit/replacement/delete, circular publish/edit/delete, and event publish/hide/delete passed.",
    );

    for (const [route, searchSelector] of [
      ["/admin/documents", '[aria-label="Search documents"]'],
      ["/admin/circulars", '[aria-label="Search circulars"]'],
      ["/admin/sections?tab=events", '[aria-label="Search events"]'],
      ["/admin/sections?tab=slides", '[aria-label="Search slides"]'],
    ]) {
      await navigate(route);
      await setInput(searchSelector, "no-match-dashboard-verification");
      await waitFor("!!document.querySelector('.admin-empty')", "a useful empty search state");
    }
    await navigate("/admin/sections?tab=slides");
    ensure(
      await evaluate(
        "document.querySelector('.admin-main').textContent.includes('Current Homepage Background')",
      ),
      "The active homepage slide was not clearly marked.",
    );

    await command("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await navigate("/admin/dashboard");
    ensure(
      await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),
      "The mobile dashboard overflowed horizontally.",
    );
    await screenshot("dashboard-mobile.png");
    await click('[aria-label="Open admin menu"]');
    await waitFor("document.querySelector('.admin-drawer')?.open", "the mobile drawer");
    await screenshot("sidebar-mobile.png");
    await command("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await command("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await waitFor(
      "!document.querySelector('.admin-drawer')?.open",
      "Escape to close the mobile menu",
    );
    await click('[aria-label="Open admin menu"]');
    await click('dialog a[href="/admin/background"]');
    await waitFor(
      "location.pathname === '/admin/background' && !document.querySelector('.admin-drawer')?.open",
      "mobile navigation to the background manager",
    );
    ensure(
      await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),
      "The mobile background manager overflowed horizontally.",
    );
    await screenshot("background-mobile.png");
    await click('[aria-label="Open admin menu"]');
    await click('dialog button[aria-label="Sign out"]');
    await waitFor("location.pathname === '/admin/login'", "logout to return to login");
    ensure(
      (await evaluate("fetch('/api/admin/content').then(response => response.status)")) === 401,
      "Logout did not invalidate browser access.",
    );
    report(
      "Browser: management-screen searches, current-slide badge, 390px mobile layouts, drawer navigation/Escape and logout passed.",
    );
    ensure(
      browserProblems.length === 0,
      `Browser errors or warnings: ${browserProblems.join(", ")}`,
    );
    return { skipped: false };
  } finally {
    if (socket?.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ id: 999999, method: "Browser.close" }));
      } catch {}
      socket.close();
    }
    await pause(300);
    browser.kill();
    if (path.resolve(profile).startsWith(`${path.resolve(cache)}${path.sep}`)) {
      try {
        await rm(profile, { recursive: true, force: true });
      } catch {}
    }
  }
}
