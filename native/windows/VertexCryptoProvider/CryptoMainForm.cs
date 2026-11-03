using System.Drawing;
using System.Globalization;
using System.Net.Http;
using System.Text.Json;
using System.Windows.Forms;

namespace VertexCryptoProvider;

/// <summary>Native Windows desktop interface, separate from Vertex's web dashboard.</summary>
public sealed class CryptoMainForm : Form
{
 private static readonly HttpClient Client = new() { Timeout=TimeSpan.FromSeconds(12) };
 private readonly TextBox Search=new();
 private readonly Label Status=new();
 private readonly ListView Markets=new();
 private readonly Button Reload=new();
 private readonly System.Windows.Forms.Timer RefreshTimer=new(){Interval=60000};
 private readonly List<CryptoRow> Rows=new();
 private bool loading=false;

 private sealed record CryptoRow(string Id,string Name,double? Price,double? Change,
  string? Time,string? Source);

 public CryptoMainForm()
 {
  Text="Vertex Crypto · Mercati e widget";
  Width=980;Height=720;MinimumSize=new Size(640,480);
  BackColor=Color.FromArgb(7,19,32);
  ForeColor=Color.White;
  Font=new Font("Segoe UI",10f);
  StartPosition=FormStartPosition.CenterScreen;

  var toolbar=new Panel{Height=134,Dock=DockStyle.Top,
   BackColor=Color.FromArgb(13,33,54),Padding=new Padding(18,12,18,8)};
  Controls.Add(toolbar);

  var heading=new Label{Text="VERTEX CRYPTO",Font=new Font("Segoe UI",21f,FontStyle.Bold),
   ForeColor=Color.FromArgb(98,180,255),Location=new Point(18,10),AutoSize=true};
  toolbar.Controls.Add(heading);

  var instructions=new Label{Text="App nativa per Windows 11. Widget crypto nella bacheca Win + W.",
   ForeColor=Color.FromArgb(172,194,220),Location=new Point(20,57),AutoSize=true};
  toolbar.Controls.Add(instructions);

  Search.PlaceholderText="Cerca BTC, Ethereum, Solana, ORE…";
  Search.BackColor=Color.FromArgb(28,49,71);
  Search.ForeColor=Color.White;
  Search.BorderStyle=BorderStyle.FixedSingle;
  Search.SetBounds(18,90,390,27);
  Search.Anchor=AnchorStyles.Left|AnchorStyles.Top;
  Search.TextChanged+=(_,_)=>RenderQuotes();
  toolbar.Controls.Add(Search);

  Reload.Text="Aggiorna";
  Reload.SetBounds(420,88,116,32);
  Reload.BackColor=Color.FromArgb(38,100,156);
  Reload.ForeColor=Color.White;
  Reload.FlatStyle=FlatStyle.Flat;
  Reload.Click+=async (_,_)=>await RefreshQuotesAsync();
  toolbar.Controls.Add(Reload);

  var help=new Button{Text="Come aggiungere widget",AutoSize=false,
   BackColor=Color.FromArgb(36,70,101),ForeColor=Color.White,
   FlatStyle=FlatStyle.Flat};
  help.SetBounds(548,88,208,32);
  help.Click+=(_,_)=>MessageBox.Show(this,
   "Premi Win + W, scegli Aggiungi widget (+), cerca Vertex Crypto e seleziona una criptovaluta. " +
   "Il provider MSIX deve essere installato e registrato; la semplice apertura del sito non basta.",
   "Widget Windows 11",MessageBoxButtons.OK,MessageBoxIcon.Information);
  toolbar.Controls.Add(help);

  Markets.Dock=DockStyle.Fill;
  Markets.BackColor=Color.FromArgb(10,26,44);
  Markets.ForeColor=Color.White;
  Markets.View=View.Details;
  Markets.FullRowSelect=true;
  Markets.GridLines=false;
  Markets.HideSelection=false;
  Markets.Columns.Add("Crypto",235);
  Markets.Columns.Add("Prezzo (USD)",155,HorizontalAlignment.Right);
  Markets.Columns.Add("24h",105,HorizontalAlignment.Right);
  Markets.Columns.Add("Ora dato",160);
  Markets.Columns.Add("Fonte",190);
  Markets.DoubleClick+=(_,_)=>ShowSelected();
  Controls.Add(Markets);
  Markets.BringToFront();

  Status.Dock=DockStyle.Bottom;
  Status.Height=44;
  Status.Padding=new Padding(16,12,8,8);
  Status.Text="Caricamento quote…";
  Status.ForeColor=Color.FromArgb(164,187,209);
  Controls.Add(Status);

  RefreshTimer.Tick+=async (_,_)=>await RefreshQuotesAsync();
  RefreshTimer.Start();
  Shown+=async (_,_)=>await RefreshQuotesAsync();
  FormClosed+=(_,_)=>RefreshTimer.Stop();
 }

 private async Task RefreshQuotesAsync()
 {
  if(loading)return;
  loading=true;
  Reload.Enabled=false;
  Status.Text="Aggiornamento delle quotazioni verificate…";
  try
  {
   using var response=await Client.GetAsync(
    "https://raw.githubusercontent.com/alerai1994/Dashboard-/main/market-quotes.json");
   response.EnsureSuccessStatusCode();
   var body=await response.Content.ReadAsStringAsync();
   using var doc=JsonDocument.Parse(body);
   if(!doc.RootElement.TryGetProperty("crypto",out var arr)||
      arr.ValueKind!=JsonValueKind.Array)throw new FormatException("Crypto assenti");

   var loaded=new List<CryptoRow>();
   foreach(var row in arr.EnumerateArray())
   {
    if(!row.TryGetProperty("id",out var idProp))continue;
    var id=idProp.GetString()??"";
    if(!CoinIds.All.Contains(id))continue;
    double? ParseNumber(string key)=>
     row.TryGetProperty(key,out var field)&&field.ValueKind==JsonValueKind.Number&&
     field.TryGetDouble(out var value)&&double.IsFinite(value)?value:null;
    string? ParseString(string key)=>row.TryGetProperty(key,out var field)&&
      field.ValueKind==JsonValueKind.String?field.GetString():null;
    loaded.Add(new CryptoRow(id,id.ToUpperInvariant(),ParseNumber("value"),
     ParseNumber("change"),ParseString("time"),ParseString("source")));
   }
   if(loaded.Count==0)throw new FormatException("Feed vuoto");
   Rows.Clear();Rows.AddRange(loaded);
   Status.Text=$"{Rows.Count} crypto disponibili · Fonte Vertex · quotazioni anche ritardate";
   RenderQuotes();
  }
  catch(Exception)
  {
   Status.Text=Rows.Count>0?
    "Feed non raggiungibile · ultimi valori verificati conservati":
    "Feed non raggiungibile · nessun prezzo inventato";
  }
  finally{loading=false;Reload.Enabled=true;}
 }

 private void RenderQuotes()
 {
  if(Markets.IsDisposed)return;
  var needle=Search.Text.Trim();
  Markets.BeginUpdate();
  try
  {
   Markets.Items.Clear();
   foreach(var row in Rows.OrderBy(r=>r.Id).Where(r=>
     r.Id.Contains(needle,StringComparison.OrdinalIgnoreCase)||
     r.Name.Contains(needle,StringComparison.OrdinalIgnoreCase)))
   {
    var price=row.Price is >0 p?
     p.ToString(p>=1?"N2":"N7",CultureInfo.GetCultureInfo("it-IT")):"—";
    var change=row.Change is double pct?pct.ToString("+0.00;-0.00;0.00")+"%":"—";
    var time=DateTimeOffset.TryParse(row.Time,out var date)?
     date.ToLocalTime().ToString("dd/MM HH:mm"):"n.d.";
    var item=new ListViewItem(row.Name){Tag=row};
    item.SubItems.Add(price);
    item.SubItems.Add(change);
    item.SubItems.Add(time);
    item.SubItems.Add(row.Source??"n.d.");
    item.UseItemStyleForSubItems=false;
    item.SubItems[2].ForeColor=row.Change is null?Color.LightGray:
      row.Change>=0?Color.FromArgb(35,226,157):Color.FromArgb(255,101,123);
    Markets.Items.Add(item);
   }
  }
  finally{Markets.EndUpdate();}
 }

 private void ShowSelected()
 {
  if(Markets.SelectedItems.Count==0)return;
  if(Markets.SelectedItems[0].Tag is not CryptoRow row)return;
  MessageBox.Show(this,
   $"Criptovaluta: {row.Name}\nFonte: {row.Source??"n.d."}\nQuotazione: {row.Time??"n.d."}\n\n" +
   "Per aggiungere questa criptovaluta alla bacheca Widget, premi Win + W e scegli Vertex.",
   "Dettagli Vertex",MessageBoxButtons.OK,MessageBoxIcon.Information);
 }
}
