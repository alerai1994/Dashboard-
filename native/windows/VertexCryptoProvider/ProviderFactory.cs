using System;
using System.Runtime.InteropServices;
using Microsoft.Windows.Widgets.Providers;
using WinRT;

namespace VertexCryptoProvider;

// Standard packaged COM local-server class factory for Windows Widgets.
internal static class COMGuids
{
 public const string ClassFactory = "00000001-0000-0000-C000-000000000046";
 public const string IUnknown = "00000000-0000-0000-C000-000000000046";
}

[ComImport, ComVisible(false), InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid(COMGuids.ClassFactory)]
internal interface IClassFactory
{
 [PreserveSig] int CreateInstance(IntPtr outer, ref Guid riid, out IntPtr instance);
 [PreserveSig] int LockServer(bool locked);
}

[ComVisible(true)]
internal sealed class ProviderFactory<T> : IClassFactory where T : IWidgetProvider, new()
{
 private const int CLASS_E_NOAGGREGATION = -2147221232;
 private const int E_NOINTERFACE = -2147467262;

 public int CreateInstance(IntPtr outer, ref Guid riid, out IntPtr instance)
 {
  instance=IntPtr.Zero;
  if(outer!=IntPtr.Zero)return CLASS_E_NOAGGREGATION;
  if(riid!=typeof(T).GUID&&riid!=Guid.Parse(COMGuids.IUnknown))
   return E_NOINTERFACE;
  try {
   instance=MarshalInspectable<IWidgetProvider>.FromManaged(new T());
   return 0;
  }catch(Exception error){
   return Marshal.GetHRForException(error);
  }
 }
 public int LockServer(bool locked)=>0;
}
