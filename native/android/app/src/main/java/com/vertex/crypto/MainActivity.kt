package com.vertex.crypto

import android.app.Activity
import android.os.Bundle
import android.view.Gravity
import android.widget.TextView

class MainActivity : Activity() {
 override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)
  val text=TextView(this).apply {
   text="Vertex Crypto\n\nTieni premuto sulla schermata Home, scegli Widget, cerca Vertex Crypto e seleziona una criptovaluta."
   textSize=19f
   gravity=Gravity.CENTER
   setPadding(40,40,40,40)
  }
  setContentView(text)
 }
}
