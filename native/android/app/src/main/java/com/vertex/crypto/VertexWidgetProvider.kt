package com.vertex.crypto

import android.app.PendingIntent
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
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

class VertexWidgetProvider : AppWidgetProvider() {
 companion object {
  const val ACTION_REFRESH = "com.vertex.crypto.REFRESH_WIDGET"
  private const val QUOTES_URL =
   "https://raw.githubusercontent.com/alerai1994/Dashboard-/main/market-quotes.json"

  private fun readFeed(): JSONObject? = try {
   val connection = URL(QUOTES_URL).openConnection() as HttpURLConnection
   connection.connectTimeout = 9000
   connection.readTimeout = 9000
   connection.setRequestProperty("Accept", "application/json")
   try {
    if (connection.responseCode !in 200..299) null
    else connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
   } finally { connection.disconnect() }
  } catch (_: Exception) { null }

  private fun quote(feed: JSONObject, id: String): JSONObject? {
   val group=MarketCatalog.byId[id]?.feedGroup ?: return null
   val rows = feed.optJSONArray(group) ?: return null
   for (i in 0 until rows.length()) {
    val row = rows.optJSONObject(i) ?: continue
    if (row.optString("id") == id) return row
   }
   return null
  }

  private fun renderWidget(context: Context, manager: AppWidgetManager, id: Int, feed: JSONObject?) {
   val selected = context.getSharedPreferences("vertex_widgets", Context.MODE_PRIVATE)
    .getString("coin_$id", "btc") ?: "btc"

   // Keep the last verified widget data on temporary network failure.
   if (feed == null) return

   val row = quote(feed, selected)
   val value = row?.optDouble("value", Double.NaN) ?: Double.NaN
   val change = row?.optDouble("change", Double.NaN) ?: Double.NaN
   val spec=MarketCatalog.byId[selected]
   val currency=row?.optString("currency")?.takeIf { it.isNotBlank() } ?: "USD"
   val price=when {
    !value.isFinite()||value<=0 -> "—"
    spec?.feedGroup=="forex" -> String.format(Locale.ITALY,if(value>=100)"%,.3f" else "%,.5f",value)
    spec?.feedGroup=="markets" -> String.format(Locale.ITALY,"%,.2f",value)
    else -> {
     val digits=when {
      value>=1 -> 2
      value>=0.01 -> 4
      value>=0.0001 -> 6
      else -> 9
     }
     val amount=String.format(Locale.ITALY,"%,"+ "."+digits+"f",value)
     if(currency=="USD"||currency=="USDT") "$"+amount else amount+" "+currency
    }
   }
   val percent=if(change.isFinite())String.format(Locale.ITALY,"%+.2f%%",change) else "—"
   val quoteTime=row?.optString("time")?.takeIf { it.isNotBlank() }
   val asOf=try {
    val local=OffsetDateTime.parse(quoteTime).atZoneSameInstant(ZoneId.of("Europe/Rome"))
    "Rilevato "+local.format(DateTimeFormatter.ofPattern("dd/MM HH:mm"))
   }catch (_:Exception){"Orario fonte non disponibile"}
   // The colored share price responds to actual successive observations,
   // not to the day's percentage (which is displayed separately).
   val prefs=context.getSharedPreferences("vertex_widgets",Context.MODE_PRIVATE)
   val previous=prefs.getString("last_price_$id",null)?.toDoubleOrNull()
   val previousSource=prefs.getString("last_source_$id",null)
   val previousTime=prefs.getString("last_time_$id",null)
   val lastDirection=prefs.getInt("last_direction_$id",0)
   val source=row?.optString("source") ?: ""
   val sameSource=previousSource==source
   val sameObservation=previousTime==quoteTime
   val direction=when {
    !value.isFinite()||value<=0||previous==null||previous<=0||!sameSource -> 0
    previousTime!=null&&quoteTime!=null&&previousTime>quoteTime -> lastDirection
    value>previous -> 1
    value<previous -> -1
    sameObservation -> lastDirection
    else -> 0
   }
   if(value.isFinite()&&value>0&&
    (previousTime==null||quoteTime==null||previousTime<=quoteTime)){
    prefs.edit()
     .putString("last_price_$id",value.toString())
     .putString("last_source_$id",source)
     .putString("last_time_$id",quoteTime)
     .putInt("last_direction_$id",direction)
     .apply()
   }

   val editIntent = Intent(context, WidgetConfigActivity::class.java).apply {
    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
   }
   val editPending = PendingIntent.getActivity(context, id, editIntent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

   val refreshIntent = Intent(context, VertexWidgetProvider::class.java).apply {
    action = ACTION_REFRESH
    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(id))
   }
   val refreshPending = PendingIntent.getBroadcast(context, id + 10000, refreshIntent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

   val views = RemoteViews(context.packageName, R.layout.widget_crypto).apply {
    setTextViewText(R.id.widget_name, "VERTEX · " + (MarketCatalog.names[selected] ?: selected.uppercase()))
    setTextViewText(R.id.widget_price, price)
    setTextViewText(R.id.widget_change, percent)
    setTextViewText(R.id.widget_asof, asOf)
    setTextColor(R.id.widget_price,when{
     direction>0 -> Color.rgb(29,220,158)
     direction<0 -> Color.rgb(255,102,119)
     else -> Color.WHITE
    })
    setTextColor(R.id.widget_change, when {
     !change.isFinite() -> Color.GRAY
     change < 0 -> Color.rgb(255,102,119)
     change > 0 -> Color.rgb(29,220,158)
     else -> Color.GRAY
    })
    setOnClickPendingIntent(R.id.widget_name, editPending)
    setOnClickPendingIntent(R.id.widget_refresh, refreshPending)
   }
   manager.updateAppWidget(id, views)
  }
 }

 override fun onReceive(context: Context, intent: Intent) {
   if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE ||
       intent.action == ACTION_REFRESH) {
    val pending = goAsync()
    val app = context.applicationContext
    val manager = AppWidgetManager.getInstance(app)
    val ids = intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS)
     ?: manager.getAppWidgetIds(ComponentName(app, VertexWidgetProvider::class.java))
    Thread {
     try {
      val feed = readFeed()
      ids.forEach { id ->
       if (id != AppWidgetManager.INVALID_APPWIDGET_ID) renderWidget(app, manager, id, feed)
      }
     } finally { pending.finish() }
    }.start()
    return
   }
   super.onReceive(context, intent)
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
   val prefs = context.getSharedPreferences("vertex_widgets", Context.MODE_PRIVATE)
   val editor = prefs.edit()
   appWidgetIds.forEach {
    editor.remove("coin_$it")
    editor.remove("last_price_$it")
    editor.remove("last_source_$it")
    editor.remove("last_time_$it")
    editor.remove("last_direction_$it")
   }
   editor.apply()
   super.onDeleted(context, appWidgetIds)
  }
}
