using System.Runtime.InteropServices;
using VertexCryptoProvider;

WinRT.ComWrappersSupport.InitializeComWrappers();

// The same CLSID is registered in Package.appxmanifest.
var clsid=Guid.Parse("95E6D4EC-2FAD-4B5D-97CC-58D213321A44");
var factory=new ProviderFactory<CryptoWidgetProvider>();

Marshal.ThrowExceptionForHR(CoRegisterClassObject(
 clsid,factory,0x4 /* CLSCTX_LOCAL_SERVER */,0x1 /* REGCLS_MULTIPLEUSE */,
 out uint registrationCookie));

try {
 // COM activation is controlled by the Windows widget host.
 Thread.Sleep(Timeout.Infinite);
}
finally {
 CoRevokeClassObject(registrationCookie);
 GC.KeepAlive(factory);
}

[DllImport("ole32.dll")]
static extern int CoRegisterClassObject(
 [MarshalAs(UnmanagedType.LPStruct)] Guid clsid,
 [MarshalAs(UnmanagedType.IUnknown)] object factory,
 uint context,uint flags,out uint cookie);

[DllImport("ole32.dll")]
static extern int CoRevokeClassObject(uint cookie);
