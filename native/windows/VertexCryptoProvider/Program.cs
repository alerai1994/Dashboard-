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
  WinRT.ComWrappersSupport.InitializeComWrappers();
  var factory=new ProviderFactory<CryptoWidgetProvider>();

  // Register the native Windows Widget provider for both direct app launches
  // and COM activations. The registration is local to this process.
  Marshal.ThrowExceptionForHR(CoRegisterClassObject(
    ProviderClsid,factory,0x4,0x1,out uint cookie));
  try
  {
   bool background=args.Any(arg=>
    arg.Equals("-Embedding",StringComparison.OrdinalIgnoreCase)||
    arg.Equals("/Embedding",StringComparison.OrdinalIgnoreCase)||
    arg.Equals("--com-server",StringComparison.OrdinalIgnoreCase));
   if(background)
   {
    using var keepAlive=new ManualResetEvent(false);
    keepAlive.WaitOne();
   }
   else
   {
    ApplicationConfiguration.Initialize();
    Application.Run(new CryptoMainForm());
   }
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
