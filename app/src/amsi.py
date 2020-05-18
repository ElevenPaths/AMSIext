#!/usr/bin/python -u

import json
import sys
import struct
import urllib

import windows
import windows.winproxy
import windows.generated_def as gdef

class AMSIProxy(windows.winproxy.ApiProxy):
    APIDLL = "Amsi"
    default_error_check = staticmethod(windows.winproxy.no_error_check)

"""
HRESULT WINAPI AmsiInitialize(
  _In_  LPCWSTR      appName,
/*_In_  DWORD        coInit, REMOVED */
  _Out_ HAMSICONTEXT *amsiContext
);
"""
AmsiInitializePrototype = gdef.WINFUNCTYPE(gdef.BOOL, gdef.LPCWSTR, gdef.POINTER(gdef.PVOID))
AmsiInitializeParams = ((1, 'appName'),(1, 'amsiContext'))

@AMSIProxy('AmsiInitialize', deffunc_module=sys.modules[__name__])
def AmsiInitialize(appName, amsiContext):
    return AmsiInitialize.ctypes_function(appName, amsiContext)


"""
HRESULT WINAPI AmsiOpenSession(
  _In_  HAMSICONTEXT amsiContext,
  _Out_ HAMSISESSION *session
);
"""
AmsiOpenSessionPrototype = gdef.WINFUNCTYPE(gdef.BOOL, gdef.PVOID, gdef.POINTER(gdef.PVOID))
AmsiOpenSessionParams = ((1, 'amsiContext'),(1, 'session'))

@AMSIProxy('AmsiOpenSession', deffunc_module=sys.modules[__name__])
def AmsiOpenSession(amsiContext, session):
    return AmsiOpenSession.ctypes_function(amsiContext, session)


"""
HRESULT WINAPI AmsiScanBuffer(
  _In_     HAMSICONTEXT amsiContext,
  _In_     PVOID        buffer,
  _In_     ULONG        length,
  _In_     LPCWSTR      contentName,
  _In_opt_ HAMSISESSION session,
  _Out_    AMSI_RESULT  *result
);
"""
AmsiScanBufferPrototype = gdef.WINFUNCTYPE(gdef.BOOL, gdef.PVOID, gdef.PVOID, gdef.ULONG, gdef.LPCWSTR, gdef.PVOID, gdef.POINTER(gdef.ULONG))
AmsiScanBufferParams = ((1, 'amsiContext'),(1, 'buffer'),(1, 'length'),(1, 'contentName'),(1, 'session'),(1, 'result'))

@AMSIProxy('AmsiScanBuffer', deffunc_module=sys.modules[__name__])
def AmsiScanBuffer(amsiContext, buffer, length, contentName, session, result):
    return AmsiScanBuffer.ctypes_function(amsiContext, buffer, length, contentName, session, result)

"""
typedef enum AMSI_RESULT { 
  AMSI_RESULT_CLEAN                   = 0,
  AMSI_RESULT_NOT_DETECTED            = 1,
  AMSI_RESULT_BLOCKED_BY_ADMIN_START  = 16384,
  AMSI_RESULT_BLOCKED_BY_ADMIN_END    = 20479,
  AMSI_RESULT_DETECTED                = 32768
} AMSI_RESULT;

BOOL AmsiResultIsMalware(
  _In_ AMSI_RESULT r
);
"""

AMSI_RESULT_CLEAN = gdef.EnumValue("_AMSI_RESULT", "AMSI_RESULT_CLEAN", 0x0)
AMSI_RESULT_NOT_DETECTED = gdef.EnumValue("_AMSI_RESULT", "AMSI_RESULT_NOT_DETECTED", 0x1)
AMSI_RESULT_BLOCKED_BY_ADMIN_START = gdef.EnumValue("_AMSI_RESULT", "AMSI_RESULT_BLOCKED_BY_ADMIN_START", 16384)
AMSI_RESULT_BLOCKED_BY_ADMIN_END = gdef.EnumValue("_AMSI_RESULT", "AMSI_RESULT_BLOCKED_BY_ADMIN_END", 20479)
AMSI_RESULT_DETECTED = gdef.EnumValue("_AMSI_RESULT", "AMSI_RESULT_DETECTED", 32768)
class _AMSI_RESULT(gdef.EnumType):
    values = [AMSI_RESULT_CLEAN, AMSI_RESULT_NOT_DETECTED, AMSI_RESULT_BLOCKED_BY_ADMIN_START, AMSI_RESULT_BLOCKED_BY_ADMIN_END, AMSI_RESULT_DETECTED]
    mapper = {x:x for x in values}
AMSI_RESULT = _AMSI_RESULT


class AMSIScanner(object):
    def __enter__(self):
        self.context = gdef.PVOID()
        self.session = gdef.PVOID()

        if AmsiInitialize("TestEngine", self.context) != 0:
            print("AmsiInitialize failed!")

        if AmsiOpenSession(self.context, self.session) != 0:
            print("AmsiOpenSession failed!")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass # TODO release the AMSI engine

    def scan(self, buffer):
        result = AMSI_RESULT()
        AmsiScanBuffer(self.context, buffer, len(buffer), "fakefile.bin", self.session, result)
        return result

# Read a message from stdin and decode it.
def get_message():
    raw_length = sys.stdin.read(4)
    if not raw_length:
        sys.exit(0)
    message_length = struct.unpack('=I', raw_length)[0]
    message = sys.stdin.read(message_length)
    return json.loads(message)

# Encode a message for transmission, given its content.
def encode_message(message_content):
    encoded_content = json.dumps(message_content)
    encoded_length = struct.pack('=I', len(encoded_content))
    return {'length': encoded_length, 'content': encoded_content}

# Send an encoded message to stdout.
def send_message(encoded_message):
    sys.stdout.write(encoded_message['length'])
    sys.stdout.write(encoded_message['content'])
    sys.stdout.flush()

with AMSIScanner() as scanner:
    while True:
        try:
            message = get_message()
            result = {
                "tabId": message["tabId"],
                "origin": message["origin"],
                "type": message["type"],
                "result": True
            }
            res = scanner.scan(urllib.unquote(message["message"]).encode('utf-8'))
            if (res.value.numerator == 0) or (res.value.numerator == 1):
                result["result"] = False
            send_message(encode_message(result))
        except Exception as e:
            send_message(encode_message("Exception: {}".format(e)))
            pass
