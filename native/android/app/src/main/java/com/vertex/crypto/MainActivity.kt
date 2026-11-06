package com.vertex.crypto

import android.app.Activity
import android.app.AlertDialog
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.graphics.Color
import android.graphics.Typeface
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.text.Editable
import android.text.TextWatcher
import java.util.Locale

/** Native Android market app: independently usable without the dashboard web page. */
class MainActivity : Activity() {
 private val handler=Handler(Looper.getMainLooper())
 private val quotes=mutableListOf<CryptoQuote>()
 private lateinit var cards:LinearLayout
 private lateinit var status:TextView
 private lateinit var search:EditText
 private var busy=false
 private var lastRefresh=0L

 private val periodic=object:Runnable {
  override fun run(){
   if(!isFinishing&&!isDestroyed){
    if(System.currentTimeMillis()-lastRefresh>=60000)refresh()
    handler.postDelayed(this,60000)
   }
  }
 }

 private fun dp(n:Int)= (resources.displayMetrics.density*n).toInt()
 private fun label(text:String,size:Float=14f,color:Int=Color.WHITE):TextView =
  TextView(this).apply { this.text=text;textSize=size;setTextColor(color) }

 private fun nativeButton(text:String,onClick:()->Unit):Button = Button(this).apply {
  this.text=text
  setOnClickListener{onClick()}
 }

 override fun onCreate(savedInstanceState:Bundle?){
  super.onCreate(savedInstanceState)
  window.statusBarColor=Color.rgb(6,16,27)
  window.navigationBarColor=Color.rgb(6,16,27)
  val content=LinearLayout(this).apply {
   orientation=LinearLayout.VERTICAL
   setPadding(dp(16),dp(18),dp(16),dp(16))
   setBackgroundColor(Color.rgb(7,19,32))
  }
  content.addView(label("VERTEX · MERCATI",26f,Color.rgb(101,179,255)).apply {
   setTypeface(null,Typeface.BOLD)
  })
  content.addView(label("Indici, Tech, Big Tech, materie prime, Forex, ETF e Crypto",14f,Color.rgb(167,187,210)))
  val controls=LinearLayout(this).apply {orientation=LinearLayout.HORIZONTAL}
  controls.addView(nativeButton("Aggiorna"){refresh()},
   LinearLayout.LayoutParams(0,dp(54),1f))
  controls.addView(nativeButton("Aggiungi widget"){pinWidget()},
   LinearLayout.LayoutParams(0,dp(54),1f))
  content.addView(controls)
  search=EditText(this).apply{
   hint="Cerca BTC, NVIDIA, EUR/USD, ETF…"
   setSingleLine(true)
   setTextColor(Color.WHITE)
   setHintTextColor(Color.rgb(132,153,176))
   inputType=android.text.InputType.TYPE_CLASS_TEXT
  }
  content.addView(search)
  status=label("Ricerca quotazioni…",12f,Color.rgb(144,166,188))
  content.addView(status)
  val scroll=ScrollView(this).apply {isFillViewport=true}
  cards=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL}
  scroll.addView(cards)
  content.addView(scroll,LinearLayout.LayoutParams(
   ViewGroup.LayoutParams.MATCH_PARENT,0,1f))
  content.addView(label("Prezzi anche ritardati. Tocca un mercato per i dettagli. " +
   "Per configurare i widget: tieni premuta la Home → Widget → Vertex Mercati.",
   11f,Color.rgb(145,166,185)))
  setContentView(content)
  search.addTextChangedListener(object:TextWatcher{
   override fun beforeTextChanged(s:CharSequence?,start:Int,count:Int,after:Int){}
   override fun onTextChanged(s:CharSequence?,start:Int,before:Int,count:Int){draw()}
   override fun afterTextChanged(s:Editable?){}
  })
  refresh()
 }

 override fun onResume(){
  super.onResume()
  handler.removeCallbacks(periodic)
  handler.postDelayed(periodic,60000)
 }
 override fun onPause(){handler.removeCallbacks(periodic);super.onPause()}

 private fun pinWidget(){
  val manager=AppWidgetManager.getInstance(this)
  val provider=ComponentName(this,VertexWidgetProvider::class.java)
  if(android.os.Build.VERSION.SDK_INT>=26&&manager.isRequestPinAppWidgetSupported){
   val requested=manager.requestPinAppWidget(provider,null,null)
   if(requested) {
    AlertDialog.Builder(this).setTitle("Vertex Mercati")
     .setMessage("Conferma il widget sulla Home. Scegli il mercato da mostrare nella schermata di configurazione.")
     .setPositiveButton("OK",null).show()
    return
   }
  }
  AlertDialog.Builder(this).setTitle("Aggiungi un widget")
   .setMessage("Tieni premuta la schermata Home, apri Widget, cerca Vertex Mercati e scegli il mercato.")
   .setPositiveButton("OK",null).show()
 }
 private fun refresh(){
  if(busy)return
  busy=true
  status.text="Aggiornamento quotazioni…"
  Thread {
   try{
    val result=QuoteRepository.fetch()
    runOnUiThread {
     if(isFinishing||isDestroyed)return@runOnUiThread
     quotes.clear()
     quotes.addAll(result)
     lastRefresh=System.currentTimeMillis()
     busy=false
     status.text="${quotes.size} strumenti disponibili · fonte Vertex · dati anche ritardati"
     draw()
    }
   }catch(error:Exception){
    runOnUiThread{
     if(isFinishing||isDestroyed)return@runOnUiThread
     busy=false
     status.text="Feed non raggiungibile: mostro gli ultimi dati caricati."
     draw()
    }
   }
  }.start()
 }
 private fun draw(){
  if(!::cards.isInitialized)return
  val needle=search.text.toString().trim().lowercase(Locale.ROOT)
  cards.removeAllViews()
  val list=quotes.filter{q->
   val title=MarketCatalog.names[q.id]?:q.id
   needle.isEmpty()||title.lowercase(Locale.ROOT).contains(needle)||q.id.contains(needle)
  }
  if(list.isEmpty()){
   cards.addView(label(if(quotes.isEmpty())"Nessuna quotazione caricata" else "Nessun risultato",15f))
   return
  }
  for(q in list){
   val panel=LinearLayout(this).apply {
    orientation=LinearLayout.VERTICAL
    setPadding(dp(16),dp(12),dp(16),dp(12))
    setBackgroundColor(Color.rgb(15,35,55))
    val params=LinearLayout.LayoutParams(-1,-2).apply{bottomMargin=dp(8)}
    layoutParams=params
   }
   val title=label(MarketCatalog.names[q.id]?:q.id,16f).apply{
    setTypeface(null,Typeface.BOLD)
   }
   panel.addView(title)
   val asset=MarketCatalog.byId[q.id]
   val price=q.price?.let {
    when(asset?.feedGroup){
     "forex" -> String.format(Locale.ITALY,if(it>=100)"%,.3f" else "%,.5f",it)
     "markets" -> String.format(Locale.ITALY,"%,.2f",it)
     else -> {
      val digits=when {
       it>=1 -> 2
       it>=0.01 -> 4
       it>=0.0001 -> 6
       else -> 9
      }
      "$"+String.format(Locale.ITALY,"%,."+digits+"f",it)
     }
    }
   }?:"—"
   panel.addView(label(price,23f,Color.WHITE).apply {setTypeface(null,Typeface.BOLD)})
   val pct=q.change?.let{String.format(Locale.ITALY,"%+.2f%%",it)}?:"—"
   val color=when {
    q.change==null || q.change==0.0 -> Color.LTGRAY
    q.change>0 -> Color.rgb(29,220,158)
    else -> Color.rgb(255,107,125)
   }
   panel.addView(label(pct,14f,color))
   panel.addView(label("Fonte: ${q.source?:"n.d."} · ${q.time?:"orario non disponibile"}",
    11f,Color.rgb(149,176,201)))
   panel.setOnClickListener {
    AlertDialog.Builder(this).setTitle(MarketCatalog.names[q.id]?:q.id)
     .setMessage("Prezzo: $price\nVariazione: $pct\nFonte: ${q.source?:"n.d."}\nDato: ${q.time?:"n.d."}\n\nPer aggiungerlo sulla Home, usa il widget Vertex Mercati e seleziona questo strumento.")
     .setPositiveButton("Chiudi",null).show()
   }
   cards.addView(panel)
  }
 }
}
