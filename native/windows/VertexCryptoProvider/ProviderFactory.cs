using System;
using System.Runtime.InteropServices;
using Microsoft.Windows.Widgets.Providers;
using WinRT;

namespace VertexCryptoProvider;

internal static class COMGuids
{
 public const string ClassFactory = "00000001-0000-0000-C000-000000000046";
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
 public int CreateInstance(IntPtr outer, ref Guid riid, out IntPtr instance)
 {
  instance=IntPtr.Zero;
  if(outer!=IntPtr.Zero)return CLASS_E_NOAGGREGATION;
  IntPtr ptr=IntPtr.Zero;
  try {
   ptr=MarshalInspectable<IWidgetProvider>.FromManaged(new T());
   return Marshal.QueryInterface(ptr, in riid, out instance);
  } catch(Exception error) {return Marshal.GetHRForException(error);}
  finally {if(ptr!=IntPtr.Zero)Marshal.Release(ptr);}
 }
 public int LockServer(bool locked)=>0;
}
