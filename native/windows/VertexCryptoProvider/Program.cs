using System.Runtime.InteropServices;
using System.Windows.Forms;
using VertexCryptoProvider;

internal static class Program
{
 private static readonly Guid ProviderClsid =
  Guid.Parse("95E6D4EC-2FAD-4B5D-97CC-58D213321A44");

 [STAThread]
 private static void Main(string[] args)
 {
  // Native Windows desktop app when launched by user; background COM server
  // when activated by Windows Widgets Board.
  WinRT.ComWrappersSupport.InitializeComWrappers();
  var isComActivation=args.Any(arg=>
   arg.Equals("-Embedding",StringComparison.OrdinalIgnoreCase)||
   arg.Equals("/Embedding",StringComparison.OrdinalIgnoreCase)||
   arg.Equals("--com-server",StringComparison.OrdinalIgnoreCase));

  if(!isComActivation)
  {
   ApplicationConfiguration.Initialize();
   Application.Run(new CryptoMainForm());
   return;
  }

  var factory=new ProviderFactory<CryptoWidgetProvider>();
  Marshal.ThrowExceptionForHR(CoRegisterClassObject(
    ProviderClsid,factory,0x4,0x1,out uint cookie));
  try
  {
   // The COM host drives widget lifecycle callbacks.
   using var keepAlive=new ManualResetEvent(false);
   keepAlive.WaitOne();
  }
  finally
  {
   CoRevokeClassObject(cookie);
   GC.KeepAlive(factory);
  }
 }

 [DllImport("ole32.dll")]
 private static extern int CoRegisterClassObject(
  [MarshalAs(UnmanagedType.LPStruct)] Guid clsid,
  [MarshalAs(UnmanagedType.IUnknown)] object factory,
  uint context,uint flags,out uint cookie);

 [DllImport("ole32.dll")]
 private static extern int CoRevokeClassObject(uint cookie);
}
