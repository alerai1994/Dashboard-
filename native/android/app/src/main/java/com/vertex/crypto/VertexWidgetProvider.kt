package com.vertex.crypto

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

class VertexWidgetProvider : AppWidgetProvider() {
 companion object {
  const val ACTION_REFRESH = "com.vertex.crypto.REFRESH_WIDGET"
  private const val QUOTES_URL =
    "https://raw.githubusercontent.com/alerai1994/Dashboard-/main/market-quotes.json"

  private fun readFeed(): JSONObject? = try {
   val connection=URL(QUOTES_URL).openConnection() as HttpURLConnection
   connection.connectTimeout=9000
   connection.readTimeout=9000
   connection.setRequestProperty("Accept","application/json")
   try {
    if(connection.responseCode !in 200..299) null
    else connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
   } finally { connection.disconnect() }
  } catch (_: Exception) { null }

  private fun quote(feed: JSONObject?, id:String): JSONObject? {
   val rows=feed?.optJSONArray("crypto") ?: return null
   for(i in 0 until rows.length()){
    val row=rows.optJSONObject(i) ?: continue
    if(row.optString("id")==id)return row
   }
   return null
  }

  private fun applyWidget(context:Context,manager:AppWidgetManager,id:Int,feed:JSONObject?){
   val key=context.getSharedPreferences("vertex_widgets",Context.MODE_PRIVATE)
     .getString("coin_$id","btc") ?: "btc"
   val row=quote(feed,key)
   val value=row?.optDouble("value",Double.NaN) ?: Double.NaN
   val change=row?.optDouble("change",Double.NaN) ?: Double.NaN
   val valid=value.isFinite()&&value>0
   val price=if(!valid)"—"
    else if(value>=1) "$"+String.format(Locale.US,"%,.2f",value)
    else "$"+String.format(Locale.US,"%.6f",value)
   val changeText=if(change.isFinite())String.format(Locale.US,"%+.2f%%",change) else "—"
   val asOf=row?.optString("time")?.takeIf { it.isNotBlank() }
    ?.take(16)?.replace('T',' ')?.plus(" UTC") ?: "Dati non disponibili"
   val views=RemoteViews(context.packageName,R.layout.widget_crypto).apply {
    setTextViewText(R.id.widget_name,"VERTEX · "+(CoinCatalog.names[key] ?: key.uppercase()))
    setTextViewText(R.id.widget_price,price)
    setTextViewText(R.id.widget_change,changeText)
    setTextViewText(R.id.widget_asof,asOf)
    setTextColor(R.id.widget_change,if(!change.isFinite())Color.GRAY else
     if(change>=0)Color.rgb(29,220,158) else Color.rgb(255,102,119))
   }
   manager.updateAppWidget(id,views)
  }
 }
 override fun onReceive(context:Context,intent:Intent){
  if(intent.action==AppWidgetManager.ACTION_APPWIDGET_UPDATE ||
     intent.action==ACTION_REFRESH){
   val pending=goAsync()
   val app=context.applicationContext
   val manager=AppWidgetManager.getInstance(app)
   val ids=intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS)
    ?:manager.getAppWidgetIds(ComponentName(app,VertexWidgetProvider::class.java))
   Thread {
    try {
     val feed=readFeed()
     ids.forEach { id-> if(id!=AppWidgetManager.INVALID_APPWIDGET_ID)
      applyWidget(app,manager,id,feed) }
    } finally { pending.finish() }
   }.start()
   return
  }
  super.onReceive(context,intent)
 }
}
