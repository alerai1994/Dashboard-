using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Text.Json;
using Microsoft.Windows.Widgets;
using Microsoft.Windows.Widgets.Providers;

namespace VertexCryptoProvider;

// Packaged Windows App SDK native provider. DefinitionId == selected coin ID.
public sealed class CryptoWidgetProvider : IWidgetProvider
{
 private static readonly object Gate=new();
 private static readonly Dictionary<string,string> WidgetToCoin=new();
 private static readonly HttpClient Client=new() { Timeout=TimeSpan.FromSeconds(12) };
 private static readonly CultureInfo Italian=CultureInfo.GetCultureInfo("it-IT");
 private static readonly string Url=
  "https://raw.githubusercontent.com/alerai1994/Dashboard-/main/market-quotes.json";
 private static readonly string CardTemplate = """
{
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "type": "AdaptiveCard",
  "version": "1.5",
  "body": [
    {
      "type": "TextBlock",
      "text": "VERTEX · ${name}",
      "size": "Medium",
      "weight": "Bolder",
      "color": "Accent"
    },
    {
      "type": "TextBlock",
      "text": "${price}",
      "size": "ExtraLarge",
      "weight": "Bolder"
    },
    {
      "type": "TextBlock",
      "text": "${change}",
      "color": "${color}",
      "weight": "Bolder"
    },
    {
      "type": "TextBlock",
      "text": "${asof}",
      "size": "Small",
      "isSubtle": true,
      "wrap": true
    },
    {
      "type": "TextBlock",
      "text": "${source}",
      "size": "Small",
      "isSubtle": true,
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Apri Vertex",
      "url": "https://github.com/alerai1994/Dashboard-"
    }
  ]
}
""";
 private static readonly Timer UpdateTimer =
  new(_=>_ = UpdateAllAsync(),null,TimeSpan.FromMinutes(15),TimeSpan.FromMinutes(15));

 public CryptoWidgetProvider()
 {
  try {
   foreach(var item in WidgetManager.GetDefault().GetWidgetInfos())
   {
    var context=item.WidgetContext;
    if(CoinIds.All.Contains(context.DefinitionId))
    {
     lock(Gate){WidgetToCoin[context.Id]=context.DefinitionId;}
    }
   }
  }catch(Exception){}
  _=UpdateAllAsync();
 }

 public void CreateWidget(WidgetContext context)
 {
  var id=context.Id;
  var coin=context.DefinitionId;
  if(!CoinIds.All.Contains(coin))return;
  lock(Gate){WidgetToCoin[id]=coin;}
  SendCard(id,coin,null);
  _=UpdateAllAsync();
 }

 public void DeleteWidget(string widgetId,string customState)
 {
  lock(Gate){WidgetToCoin.Remove(widgetId);}
 }

 public void OnActionInvoked(WidgetActionInvokedArgs args) { }

 public void OnWidgetContextChanged(WidgetContextChangedArgs args)
 {
  var id=args.WidgetContext.Id;
  string? coin;
  lock(Gate){WidgetToCoin.TryGetValue(id,out coin);}
  if(coin!=null)SendCard(id,coin,null);
  _=UpdateAllAsync();
 }

 public void Activate(WidgetContext context)
 {
  lock(Gate){WidgetToCoin[context.Id]=context.DefinitionId;}
  _=UpdateAllAsync();
 }

 public void Deactivate(string widgetId) { }

 private static readonly SemaphoreSlim RefreshSemaphore=new(1,1);

 private static async Task UpdateAllAsync()
 {
  if(!await RefreshSemaphore.WaitAsync(0))return;
  try {
   using var response=await Client.GetAsync(Url);
   response.EnsureSuccessStatusCode();
   await using var stream=await response.Content.ReadAsStreamAsync();
   using var document=await JsonDocument.ParseAsync(stream);
   if(!document.RootElement.TryGetProperty("crypto",out var coins)||
    coins.ValueKind!=JsonValueKind.Array)return;
   var quotes=new Dictionary<string,JsonElement>();
   foreach(var coin in coins.EnumerateArray()){
    if(coin.TryGetProperty("id",out var id)&&id.ValueKind==JsonValueKind.String){
     quotes[id.GetString()!]=coin;
    }
   }
   KeyValuePair<string,string>[] installed;
   lock(Gate){installed=WidgetToCoin.ToArray();}
   foreach(var widget in installed){
    quotes.TryGetValue(widget.Value,out var quote);
    SendCard(widget.Key,widget.Value,quote.ValueKind==JsonValueKind.Object?quote:null);
   }
  }catch(Exception){/* Preserve last published data if the network fails. */}
  finally{RefreshSemaphore.Release();}
 }

 private static void SendCard(string widgetId,string coin,JsonElement? quote)
 {
  var price="—";
  var change="—";
  var color="Default";
  var asOf="Quotazione non disponibile";
  var source="Fonte: Vertex · feed non disponibile";
  if(quote.HasValue){
   var item=quote.Value;
   if(item.TryGetProperty("value",out var valueElement)&&
     valueElement.ValueKind==JsonValueKind.Number&&valueElement.TryGetDouble(out var value)&&
     double.IsFinite(value)&&value>0){
    price="$"+value.ToString(value>=1?"N2":"N6",Italian);
   }
   if(item.TryGetProperty("change",out var deltaElement)&&
     deltaElement.ValueKind==JsonValueKind.Number&&deltaElement.TryGetDouble(out var delta)&&
     double.IsFinite(delta)){
    change=(delta>=0?"+":"")+delta.ToString("F2",Italian)+"%";
    color=delta<0?"Attention":delta>0?"Good":"Default";
   }
   if(item.TryGetProperty("time",out var timeElement)&&
     DateTimeOffset.TryParse(timeElement.GetString(),out var timestamp)){
    asOf="Quotazione "+timestamp.ToLocalTime().ToString("dd/MM HH:mm",Italian);
   }
   if(item.TryGetProperty("source",out var sourceElement))
    source="Fonte: "+sourceElement.GetString()+" · dati anche ritardati";
  }
  var data=JsonSerializer.Serialize(new {name=coin.ToUpperInvariant(),price,
   change,color,asof=asOf,source});
  try {
   var options=new WidgetUpdateRequestOptions(widgetId){
    Template=CardTemplate,Data=data,CustomState=coin,
    IsPlaceholderContent=!quote.HasValue
   };
   WidgetManager.GetDefault().UpdateWidget(options);
  }catch(Exception){}
 }
}
