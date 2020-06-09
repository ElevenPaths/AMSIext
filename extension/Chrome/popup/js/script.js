var background = chrome.extension.getBackgroundPage();
var appVersion = background.version;
var extVersion = chrome.runtime.getManifest().version;

var whitelistButton = document.getElementById("add-to-whitelist");

// Detect version
if (appVersion == null) {
  message =
    '<p>Addon not detected.</br>Check if it is in the right path or download and install it from <a href="https://amsiext.e-paths.com/download-chrome.html" target="_blank">here</a>.</p>';
  setMessage(message);
} else if (extVersion != appVersion) {
  message =
    '<p>Addon version incorrect.</br>Please, download and install new version from <a href="https://amsiext.e-paths.com/download-chrome.html" target="_blank">here</a>.</p>';
  setMessage(message);
} else {
  updateButtonWhitelistStatus();
  updateButtonEmptyStatus();
}

whitelistButton.onclick = function () {
  addToWhitelist();
};

document.getElementById("empty-whitelist").onclick = function () {
  emptyWhitelist();
};

function updateButtonWhitelistStatus() {
  if (background.whitelist) {
    whitelistButton.innerHTML = "Delete this site to whitelist";
    whitelistButton.classList.add("btn-outline-danger");
    whitelistButton.classList.remove("btn-outline-success");
  } else {
    whitelistButton.innerHTML = "Add this site to whitelist";
    whitelistButton.classList.add("btn-outline-success");
    whitelistButton.classList.remove("btn-outline-danger");
  }
}

function updateButtonEmptyStatus() {
  chrome.storage.local.get("whitelist", function (result) {
    if (result) {
      if (result.whitelist.length > 0) {
        document.getElementById("empty-whitelist").removeAttribute("disabled");
      } else {
        document
          .getElementById("empty-whitelist")
          .setAttribute("disabled", true);
      }
    }
  });
}

function updateWhitelist(whitelist) {
  var map = {};
  map["whitelist"] = whitelist;
  chrome.storage.local.set(map);
}

function emptyWhitelist() {
  chrome.storage.local.set({ whitelist: [] });
  background.whitelist = false;

  updateButtonWhitelistStatus();
  updateButtonEmptyStatus();
  background.setButtonNormal();
}

function addToWhitelist() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.storage.local.get("whitelist", function (result) {
      var url = tabs[0].url;
      var whitelist = [];
      if (result.whitelist) {
        whitelist = result.whitelist;
      }
      if (whitelist.includes(url)) {
        whitelist.splice(whitelist.indexOf(url), 1);
        background.setButtonNormal();
      } else {
        whitelist.push(url);
        background.setButtonWhitelist();
      }
      updateWhitelist(whitelist);
      updateButtonWhitelistStatus();
      updateButtonEmptyStatus();
    });
  });
}

function setMessage(message) {
  document.getElementById("popup-content").classList.add("d-none");

  messages = document.getElementById("messages");
  messages.innerHTML = message;
  messages.classList.remove("d-none");
}
