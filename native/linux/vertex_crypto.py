#!/usr/bin/env python3
"""Vertex Crypto for Linux (native GTK 4). Public price data, no fabricated quotes."""
from __future__ import annotations
import json
import threading
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import gi

gi.require_version("Gtk", "4.0")
from gi.repository import Gtk, GLib

FEED_URL = "https://raw.githubusercontent.com/alerai1994/Dashboard-/main/market-quotes.json"

def price_text(value):
    try:
        value = Decimal(str(value))
        if not value.is_finite() or value <= 0:
            return "—"
        decimals = 7 if value < 1 else 2
        return f"$ {value:,.{decimals}f}"
    except (InvalidOperation, ValueError, TypeError):
        return "—"

def change_text(value):
    try:
        value = Decimal(str(value))
        if not value.is_finite():
            return "—"
        return f"{value:+.2f}%"
    except (InvalidOperation, ValueError, TypeError):
        return "—"

class VertexWindow(Gtk.ApplicationWindow):
    def __init__(self, app):
        super().__init__(application=app, title="Vertex Crypto")
        self.set_default_size(890, 640)
        self.quotes = []
        self.loading = False

        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        root.set_margin_top(18)
        root.set_margin_bottom(18)
        root.set_margin_start(22)
        root.set_margin_end(22)
        self.set_child(root)

        heading = Gtk.Label(label="VERTEX CRYPTO")
        heading.set_xalign(0)
        heading.add_css_class("title-1")
        root.append(heading)

        subtitle = Gtk.Label(label="Criptovalute e quotazioni • app Linux con interfaccia GTK")
        subtitle.set_xalign(0)
        root.append(subtitle)

        controls = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
        root.append(controls)
        self.search = Gtk.SearchEntry()
        self.search.set_placeholder_text("Cerca Bitcoin, Ethereum, ORE…")
        self.search.set_hexpand(True)
        self.search.connect("search-changed", lambda _: self.render_rows())
        controls.append(self.search)

        reload_button = Gtk.Button(label="Aggiorna")
        reload_button.connect("clicked", lambda _: self.refresh())
        controls.append(reload_button)

        self.status = Gtk.Label(label="Caricamento quotazioni…")
        self.status.set_xalign(0)
        root.append(self.status)

        scroll = Gtk.ScrolledWindow()
        scroll.set_vexpand(True)
        root.append(scroll)
        self.list_box = Gtk.ListBox()
        self.list_box.set_selection_mode(Gtk.SelectionMode.NONE)
        self.list_box.add_css_class("boxed-list")
        scroll.set_child(self.list_box)

        note = Gtk.Label(label="Dati anche ritardati. Fonte: Vertex market-quotes.json.")
        note.set_xalign(0)
        root.append(note)
        GLib.idle_add(self.refresh)
        GLib.timeout_add_seconds(60, self.refresh)

    def refresh(self):
        if self.loading:
            return True
        self.loading = True
        self.status.set_text("Aggiornamento delle quotazioni…")

        def worker():
            try:
                req = urllib.request.Request(FEED_URL, headers={
                    "User-Agent": "VertexCryptoNative/1.0",
                    "Cache-Control": "no-cache"
                })
                with urllib.request.urlopen(req, timeout=12) as response:
                    payload = json.load(response)
                rows = payload.get("crypto")
                if not isinstance(rows, list) or not rows:
                    raise ValueError("Nessuna criptovaluta")
                GLib.idle_add(self.on_quotes, rows)
            except Exception:
                GLib.idle_add(self.on_error)
        threading.Thread(target=worker, daemon=True).start()
        return True

    def on_quotes(self, rows):
        self.loading = False
        self.quotes = rows
        self.status.set_text(f"{len(rows)} crypto disponibili · possibili ritardi del feed")
        self.render_rows()
        return False

    def on_error(self):
        self.loading = False
        self.status.set_text("Feed non disponibile; ultimi dati verificati conservati.")
        return False

    def render_rows(self):
        while child := self.list_box.get_first_child():
            self.list_box.remove(child)
        needle = self.search.get_text().strip().lower()
        for quote in sorted(self.quotes, key=lambda q: str(q.get("id", ""))):
            symbol = str(quote.get("id", "")).upper()
            if needle and needle not in symbol.lower() and needle not in str(quote.get("symbol", "")).lower():
                continue
            row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=10)
            row.set_margin_top(12)
            row.set_margin_bottom(12)
            row.set_margin_start(14)
            row.set_margin_end(14)
            row_label = Gtk.Label(label=symbol)
            row_label.set_xalign(0)
            row_label.set_hexpand(True)
            row_label.add_css_class("heading")
            row.append(row_label)
            price = Gtk.Label(label=price_text(quote.get("value")))
            price.set_width_chars(18)
            price.set_xalign(1)
            row.append(price)
            delta = Gtk.Label(label=change_text(quote.get("change")))
            delta.set_width_chars(10)
            delta.set_xalign(1)
            if str(quote.get("change", "")).startswith("-"):
                delta.add_css_class("error")
            else:
                delta.add_css_class("success")
            row.append(delta)
            self.list_box.append(row)

class VertexCrypto(Gtk.Application):
    def __init__(self):
        super().__init__(application_id="com.vertex.crypto.linux")
    def do_activate(self):
        window = self.props.active_window
        if window is None:
            window = VertexWindow(self)
        window.present()

if __name__ == "__main__":
    app = VertexCrypto()
    raise SystemExit(app.run())
