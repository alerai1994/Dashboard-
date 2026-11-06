package com.vertex.crypto

import android.app.Activity
import android.app.AlertDialog
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
  content.addView(nativeButton("Aggiorna"){refresh()},
   LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,dp(54)))
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
  content.addView(label("Prezzi anche ritardati. Tocca un mercato per i dettagli.",
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
     .setMessage("Prezzo: $price\nVariazione: $pct\nFonte: ${q.source?:"n.d."}\nDato: ${q.time?:"n.d."}")
     .setPositiveButton("Chiudi",null).show()
   }
   cards.addView(panel)
  }
 }
}
