![Version](https://img.shields.io/badge/python-v2.7.16-blue.svg?style=flat-square)
![License](https://img.shields.io/badge/license-MPL-green.svg?style=flat-square)

# AMSIext

AMSIext is a Firefox and Chrome plugin that allows you to send any data stream from the browser to AMSI. AMSI is the way to communicate RAM memory with Windows Defender (or any other endpoint security system). This means that while browsing the web, AMSIext will alert you to malicious JavaScript, PowerShell or whatever − even before it may be executed or downloaded in your system!

AMSI is a native way in Windows 10 to send data in memory to your favorite AV solution. It is active by default in PowerShell and (soon) in Office. This way, if anything not detected by your AV in your local hard drive is executed by PowerShell, thanks to AMSI it will be analyzed against Defender. So, this extension sends any JavaScript, PowerShell, etc. pointed by your browser on a given web to AMSI, even before executing or downloading it.

Since Firefox and Chrome do not have methods yet to connect to AMSI, we need a little script to achieve it.

## Install

Run _install.bat_ script in the desired directory. This script installs the native messaging host for the current user, by creating a registry key:

**_Chrome_**

```
HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.elevenpaths.amsiext
```

**_Firefox_**

```
HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\amsiext
```

Set its default value to:

```
amsiext.json
```

If you want to install the native messaging host for all users, change **HKCU** to **HKLM**.

For uninstall use _uninstall.bat_ to completely remove it from the system.

## License

This project is licensed under the MPL Mozilla Public License Version 2.0 - see the LICENSE file for details

Icons made by Freepik from [www.flaticon.com](https://www.flaticon.com)

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

This software doesn't have a QA Process. This software is a Proof of Concept.
