package com.vertex.crypto

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.Spinner

/** Android launcher configuration shown when a user adds Vertex Crypto. */
class WidgetConfigActivity : Activity() {
 override fun onCreate(savedInstanceState:Bundle?){
  super.onCreate(savedInstanceState)
  setResult(RESULT_CANCELED)
  val widgetId=intent?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
   AppWidgetManager.INVALID_APPWIDGET_ID) ?: AppWidgetManager.INVALID_APPWIDGET_ID
  if(widgetId==AppWidgetManager.INVALID_APPWIDGET_ID){finish();return}
  setContentView(R.layout.activity_widget_config)
  val spinner=findViewById<Spinner>(R.id.coin_spinner)
  spinner.adapter=ArrayAdapter(this,android.R.layout.simple_spinner_dropdown_item,
   CoinCatalog.entries.map { it.second })
  findViewById<Button>(R.id.save_widget).setOnClickListener {
   val selected=CoinCatalog.entries[spinner.selectedItemPosition].first
   getSharedPreferences("vertex_widgets",MODE_PRIVATE)
    .edit().putString("coin_$widgetId",selected).apply()
   val refresh=Intent(this,VertexWidgetProvider::class.java).apply {
    action=VertexWidgetProvider.ACTION_REFRESH
    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS,intArrayOf(widgetId))
   }
   sendBroadcast(refresh)
   setResult(RESULT_OK,Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId))
   finish()
  }
 }
}
