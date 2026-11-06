package com.vertex.crypto

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Only verified public quotes; no interpolation or guessed values. */
data class CryptoQuote(
 val id:String,
 val price:Double?,
 val change:Double?,
 val time:String?,
 val source:String?
)

object QuoteRepository {
 const val FEED_URL="https://raw.githubusercontent.com/alerai1994/Dashboard-/main/market-quotes.json"

 fun fetch(): List<CryptoQuote> {
  val connection=URL(FEED_URL).openConnection() as HttpURLConnection
  connection.connectTimeout=8000
  connection.readTimeout=8000
  connection.setRequestProperty("Accept", "application/json")
  connection.setRequestProperty("Cache-Control","no-cache")
  try {
   if(connection.responseCode !in 200..299)
    throw IllegalStateException("HTTP "+connection.responseCode)
   val json=connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
   val result=mutableListOf<CryptoQuote>()
   for(group in MarketCatalog.groups){
    val rows=json.optJSONArray(group) ?: continue
    for(i in 0 until rows.length()){
     val item=rows.optJSONObject(i) ?: continue
     val id=item.optString("id")
     if(MarketCatalog.byId[id]?.feedGroup!=group)continue
     val rawPrice=item.optDouble("value",Double.NaN)
     val rawChange=item.optDouble("change",Double.NaN)
     result.add(CryptoQuote(
      id=id,
      price=rawPrice.takeIf { it.isFinite() && it>0 },
      change=rawChange.takeIf { it.isFinite() },
      time=item.optString("time").takeIf { it.isNotEmpty() },
      source=item.optString("source").takeIf { it.isNotEmpty() }
     ))
    }
   }
   if(result.isEmpty())throw IllegalStateException("Nessuna quotazione disponibile")
   return result
  } finally {connection.disconnect()}
 }
}
