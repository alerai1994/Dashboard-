# Vertex · Liquidation Heatmap CoinGlass

La sezione `#liquidations` ha una visualizzazione nativa in stile CoinGlass
con candele OHLC reali, scala prezzi, livelli di intensità, legenda, tooltip
e navigatore in basso. Il grafico non genera livelli di liquidazione falsi.

## Come ottenere il grafico annuale Binance BTC/USDT

Il dataset deve provenire da un account CoinGlass autorizzato a usare
la **Pair Liquidation Heatmap**. L'endpoint ufficiale del **Model 1** è:

`GET https://open-api-v4.coinglass.com/api/futures/liquidation/heatmap/model1?exchange=Binance&symbol=BTCUSDT&range=1y`

Gli altri modelli sono `model2` e `model3`. I dati richiedono
un abbonamento CoinGlass API Professional o superiore.
Verifica anche i termini di licenza e ridistribuzione prima di pubblicare
dati CoinGlass su un repository GitHub pubblico.

Per usarli **privatamente nel browser**, salva la risposta API JSON
sul tuo dispositivo e seleziona “Carica dati CoinGlass (.json)” nella pagina.
Nessuna chiave API viene salvata nel browser o pubblicata nel codice Vertex.

Per verificare automaticamente l'identità del mercato, si può usare un
involucro (envelope) con metadati espliciti:

```js
{
  "exchange": "Binance",
  "symbol": "BTCUSDT",
  "range": "1y",
  "model": "model1",
  "data": /* oggetto `data` della risposta API ufficiale */
}
```

I campi reali dentro `data` sono `y_axis`, `liquidation_leverage_data`,
`price_candlesticks` e `update_time`.

Senza metadati, il file JSON ufficiale può comunque essere visualizzato,
ma il grafico lo segnala come **identità non verificata**.
Se i metadati indicano un mercato, modello o periodo differente
dalla selezione corrente, il visualizzatore rifiuta il file.

È previsto anche il percorso statico, da usare *solo quando hai espliciti
diritti di pubblicazione*:

`chart-history/liquidations/binance-btcusdt-model1-1y.json`

Qui va inserito il JSON **con l'involucro** sopra indicato.
I valori di `liquidation_leverage_data` rappresentano **intensità
stimate dal modello**, non USD liquidati. Non sommare le intensità
come se fossero importi di liquidazione.

In mancanza di questi dati, resta disponibile il widget live 24H di
Blockmetric, basato sulle posizioni pubbliche Hyperliquid, che non
corrisponde al mercato Binance né a un anno di storico.

Fonti:
- https://docs.coinglass.com/reference/liquidation-heatmap
- https://docs.coinglass.com/reference/getting-started-with-your-api
- https://www.coinglass.com/pro/futures/LiquidationHeatMap
