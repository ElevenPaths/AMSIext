var port = browser.runtime.connectNative("amsiext");
var version = null;
sendMessage(null, null, null, "version");

var extensions = [
  "js",
  "ps1",
  "vbs",
  "hta",
  "vb",
  "vbe",
  "bat",
  "cmd",
  "jse",
  "wsf",
  "ws",
  "msh",
  "msh1",
  "msh2",
  "mshxml",
  "msh1xml",
  "msh2xml",
];

var whitelist = false;

browser.tabs.getCurrent(function (tab) {
  browser.browserAction.disable();
  if (tab) {
    if (validURL(tab.url)) {
      browser.browserAction.enable();
    }
  }
});

// -------------------- Our functions --------------------

function setButtonWhitelist() {
  whitelist = true;
  browser.browserAction.setIcon({
    path: {
      16: "icons/whitelist-16.png",
      32: "icons/whitelist-32.png",
      64: "icons/whitelist-64.png",
    },
  });
}

function setButtonNormal() {
  whitelist = false;
  browser.browserAction.setIcon({
    path: {
      16: "icons/normal-16.png",
      32: "icons/normal-32.png",
      64: "icons/normal-64.png",
    },
  });
}

function xhrToMessage(url, type, tabId, origin) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      sendMessage(tabId, origin, xhttp.responseText, type);
    }
  };
  xhttp.open("GET", url, true);
  xhttp.send();
}

function setImageBlob(tabId, url, id) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      // Create a binary string from the returned data, then encode it as a data URL.
      var uInt8Array = new Uint8Array(this.response);
      var i = uInt8Array.length;
      var binaryString = new Array(i);
      while (i--) {
        binaryString[i] = String.fromCharCode(uInt8Array[i]);
      }
      var data = binaryString.join("");
      var base64 = window.btoa(data);
      browser.tabs.executeScript(tabId, {
        code:
          'document.getElementById("' +
          id +
          '").src = "data:image/png;base64,' +
          base64 +
          '"',
      });
    }
  };
  xhttp.responseType = "arraybuffer";
  xhttp.open("GET", url, true);
  xhttp.send();
}

function onExecuted(tabId) {
  var amsilogo = browser.runtime.getURL("icons/normal-256.png");
  var elevenlogo = browser.runtime.getURL("icons/11paths.png");

  setTimeout(() => {
    setImageBlob(tabId, amsilogo, "amsilogo");
    setImageBlob(tabId, elevenlogo, "elevenlogo");
  }, 100);
}

function sendMessage(tabId, origin, message, type) {
  port.postMessage({
    tabId: tabId,
    origin: origin,
    message: encodeURIComponent(message),
    type: type,
  });
}

function listener(details) {
  // Comprobar si la URL está en la lista blanca
  browser.storage.local.get("whitelist", function (result) {
    var whitelist = [];
    if (result.whitelist) {
      whitelist = result.whitelist;
    }
    if (!whitelist.includes(details.url)) {
      // Comprobar el Content-Type
      var contentType = [];
      for (x in details.responseHeaders) {
        if (details.responseHeaders[x].name.toLowerCase() == "content-type") {
          var contentTypeHeader = details.responseHeaders[x].value;
          contentType = contentTypeHeader.split(";");
        }
      }
      // Expresión para obtener la extensión.
      let extension = new URL(details.url).pathname.split(".").pop();
      // Si contentType[0] no es igual a text/html y
      // si está entre las extensiones se manda todo
      if (contentType[0] != "text/html" && extension != null) {
        if (extensions.includes(extension.toLowerCase())) {
          // Se manda como si fuera menu para mostrar la notificación
          xhrToMessage(details.url, "menu", null, null);
        }
      }
    }
  });
}

// -------------------- Port object handlers --------------------

port.onMessage.addListener((response) => {
  if (response.type == "main_frame" || response.type == "script") {
    if (response.result) {
      // Comprueba que la pestaña tiene la misma URL
      browser.tabs.get(response.tabId, function callback(tab) {
        if (tab.url == response.origin) {
          // Apply HTML content
          browser.tabs.executeScript(
            response.tabId,
            {
              file: "blocked.js",
            },
            onExecuted(response.tabId)
          );
          // Apply CSS content
          browser.tabs.insertCSS(response.tabId, { file: "blocked.css" });
        }
      });
    }
  } else if (response.type == "menu") {
    var message = "Clean\nNo malicious script was found!";
    var icon = browser.runtime.getURL("icons/check.png");
    if (response.result === true) {
      message = "Warning\nMalicious script was found!";
      icon = browser.runtime.getURL("icons/warning.png");
    }
    browser.notifications.create({
      type: "basic",
      iconUrl: icon,
      title: "AMSI Extension",
      message: message,
    });
  } else if (response.type == "version") {
    version = response.result;
  }
});

port.onDisconnect.addListener(function () {
  version = null;
  port = browser.runtime.connectNative("amsiext");
});

// -------------------- Firefox API handlers --------------------

browser.menus.create({
  id: "amsi-checker",
  title: "Send to AMSI",
  contexts: ["selection"],
});

browser.menus.onClicked.addListener((info, tab) => {
  if ("amsi-checker" === info.menuItemId) {
    sendMessage(null, null, info.selectionText, "menu");
  }
});

browser.webRequest.onCompleted.addListener(
  listener,
  {
    urls: ["<all_urls>"],
    types: ["main_frame"],
  },
  ["responseHeaders"]
);

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.script) {
    sendMessage(sender.tab.id, sender.url, request.script, "main_frame");
  } else {
    xhrToMessage(request.src, "script", sender.tab.id, sender.url);
  }
});

function validURL(str) {
  var pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
    "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
    "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
    "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
    "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // fragment locator
  return !!pattern.test(str);
}

browser.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status == "complete") {
    if (validURL(tab.url)) {
      browser.browserAction.enable();
      browser.storage.local.get("whitelist", function (result) {
        var whitelist = [];
        if (result.whitelist) {
          whitelist = result.whitelist;
        }
        if (!whitelist.includes(tab.url)) {
          setButtonNormal();
          browser.tabs.executeScript(tabId, {
            code:
              "for (let item of document.scripts) { browser.runtime.sendMessage({ script: item.text, src: item.src }) }",
          });
        } else {
          setButtonWhitelist();
        }
      });
    } else {
      // setButtonNormal();
      browser.browserAction.disable();
    }
  }
});

browser.tabs.onActivated.addListener(function (activeInfo) {
  browser.tabs.get(activeInfo.tabId, function (tab) {
    if (validURL(tab.url)) {
      browser.browserAction.enable();
      browser.storage.local.get("whitelist", function (result) {
        var whitelist = [];
        if (result.whitelist) {
          whitelist = result.whitelist;
        }
        if (whitelist.includes(tab.url)) {
          setButtonWhitelist();
        } else {
          setButtonNormal();
        }
      });
    } else {
      browser.browserAction.disable();
    }
  });
});
