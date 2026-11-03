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
   val rows = feed.optJSONArray("crypto") ?: return null
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
   val price = when {
    !value.isFinite() || value <= 0 -> "—"
    value >= 1 -> "$" + String.format(Locale.US, "%,.2f", value)
    else -> "$" + String.format(Locale.US, "%.6f", value)
   }
   val percent = if (change.isFinite()) String.format(Locale.US, "%+.2f%%", change) else "—"
   val asOf = row?.optString("time")?.takeIf { it.isNotBlank() }
    ?.take(16)?.replace('T',' ')?.plus(" UTC") ?: "Quotazione non disponibile"

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
    setTextViewText(R.id.widget_name, "VERTEX · " + (CoinCatalog.names[selected] ?: selected.uppercase()))
    setTextViewText(R.id.widget_price, price)
    setTextViewText(R.id.widget_change, percent)
    setTextViewText(R.id.widget_asof, asOf)
    setTextColor(R.id.widget_change, when {
     !change.isFinite() -> Color.GRAY
     change < 0 -> Color.rgb(255,102,119)
     else -> Color.rgb(29,220,158)
    })
    setOnClickPendingIntent(R.id.widget_name, editPending)
    setOnClickPendingIntent(R.id.widget_refresh, refreshPending)
   }
   manager.updateAppWidget(id, views)
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
   appWidgetIds.forEach { editor.remove("coin_$it") }
   editor.apply()
   super.onDeleted(context, appWidgetIds)
  }
}
