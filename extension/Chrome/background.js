var port = chrome.runtime.connectNative("com.elevenpaths.amsiext");
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

// -------------------- Our functions --------------------

function updateWhitelist(whitelist) {
  var map = {};
  map["whitelist"] = whitelist;
  chrome.storage.local.set(map);
}

function setButtonWhitelist() {
  chrome.browserAction.setIcon({
    path: {
      16: "icons/whitelist-16.png",
      32: "icons/whitelist-32.png",
      64: "icons/whitelist-64.png",
    },
  });
}

function setButtonNormal() {
  chrome.browserAction.setIcon({
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
      chrome.tabs.executeScript(tabId, {
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
  var amsilogo = chrome.runtime.getURL("icons/normal-256.png");
  var elevenlogo = chrome.runtime.getURL("icons/11paths.png");

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
  chrome.storage.local.get("whitelist", function (result) {
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
      chrome.tabs.get(response.tabId, function callback(tab) {
        if (tab.url == response.origin) {
          // Apply HTML content
          chrome.tabs.executeScript(
            response.tabId,
            {
              file: "blocked.js",
            },
            onExecuted(response.tabId)
          );
          // Apply CSS content
          chrome.tabs.insertCSS(response.tabId, { file: "blocked.css" });
        }
      });
    }
  } else if (response.type == "menu") {
    var message = "Clean\nNo malicious script was found!";
    var icon = chrome.runtime.getURL("icons/check.png");
    if (response.result === true) {
      message = "Warning\nMalicious script was found!";
      icon = chrome.runtime.getURL("icons/warning.png");
    }
    chrome.notifications.create({
      type: "basic",
      iconUrl: icon,
      title: "AMSI Extension",
      message: message,
    });
  }
});

port.onDisconnect.addListener(function () {
  port = chrome.runtime.connectNative("com.elevenpaths.amsiext");
});

// -------------------- Chrome API handlers --------------------

chrome.contextMenus.create({
  id: "amsi-checker",
  title: "Send to AMSI",
  contexts: ["selection"],
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if ("amsi-checker" === info.menuItemId) {
    sendMessage(null, null, info.selectionText, "menu");
  }
});

chrome.webRequest.onCompleted.addListener(
  listener,
  {
    urls: ["<all_urls>"],
    types: ["main_frame"],
  },
  ["responseHeaders"]
);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
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

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status == "complete") {
    if (validURL(tab.url)) {
      chrome.storage.local.get("whitelist", function (result) {
        var whitelist = [];
        if (result.whitelist) {
          whitelist = result.whitelist;
        }
        if (!whitelist.includes(tab.url)) {
          setButtonNormal();
          chrome.tabs.executeScript(tabId, {
            code:
              "for (let item of document.scripts) { chrome.runtime.sendMessage({ script: item.text, src: item.src }) }",
          });
        } else {
          setButtonWhitelist();
        }
      });
    } else {
      setButtonNormal();
    }
  }
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    chrome.storage.local.get("whitelist", function (result) {
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
  });
});

chrome.browserAction.onClicked.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.storage.local.get("whitelist", function (result) {
      var url = tabs[0].url;
      var whitelist = [];
      if (result.whitelist) {
        whitelist = result.whitelist;
      }
      if (whitelist.includes(url)) {
        whitelist.splice(whitelist.indexOf(url), 1);
        setButtonNormal();
      } else {
        whitelist.push(url);
        setButtonWhitelist();
      }
      updateWhitelist(whitelist);
    });
  });
});
