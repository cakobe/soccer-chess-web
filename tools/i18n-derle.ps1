# i18n\kaynak.txt ve dil dosyalarından (en.txt, es.txt, ...) sitenin kullandığı i18n.js dosyasını üretir.
# Kullanım: önce tools\i18n-cikar.ps1, sonra powershell -File tools\i18n-derle.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root 'i18n'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$langs = 'en', 'es', 'de', 'fr'

function Read-Table([string]$path) {
  $table = @{}
  foreach ($line in [IO.File]::ReadAllLines($path, $utf8)) {
    if (-not $line.Trim()) { continue }
    $sep = $line.IndexOf('|')
    if ($sep -lt 1) { throw "Hatalı satır ($path): $line" }
    $table[[int]$line.Substring(0, $sep)] = $line.Substring($sep + 1).Trim()
  }
  return $table
}

function To-Json([string]$s) {
  if ($null -eq $s) { return 'null' }
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append('"')
  foreach ($c in $s.ToCharArray()) {
    switch ($c) {
      '"' { [void]$sb.Append('\"') }
      '\' { [void]$sb.Append('\\') }
      default {
        if ([int]$c -lt 32) { [void]$sb.Append(('\u{0:x4}' -f [int]$c)) } else { [void]$sb.Append($c) }
      }
    }
  }
  [void]$sb.Append('"')
  return $sb.ToString()
}

$src = Read-Table (Join-Path $dir 'kaynak.txt')
$count = $src.Count
$out = New-Object System.Text.StringBuilder
[void]$out.Append("// Bu dosya tools\i18n-derle.ps1 ile üretilir; elle düzenlemeyin.`n")
[void]$out.Append("window.SC_I18N = {`n")
[void]$out.Append('  src: [' + ((0..($count - 1) | ForEach-Object { To-Json $src[$_] }) -join ',') + "],`n")

foreach ($lang in $langs) {
  $table = Read-Table (Join-Path $dir "$lang.txt")
  $extra = @($table.Keys | Where-Object { $_ -ge $count -or $_ -lt 0 })
  if ($extra.Count) { throw "$lang.txt: kaynakta olmayan numaralar: $($extra -join ', ')" }
  $missing = @(0..($count - 1) | Where-Object { -not $table.ContainsKey($_) })
  "$lang : $($table.Count) çeviri, çevrilmeyen (aynı kalan) $($missing.Count): $($missing -join ' ')"
  $items = 0..($count - 1) | ForEach-Object { if ($table.ContainsKey($_)) { To-Json $table[$_] } else { 'null' } }
  [void]$out.Append("  ${lang}: [" + ($items -join ',') + "],`n")
}
[void]$out.Append("};`n")
[IO.File]::WriteAllText((Join-Path $root 'i18n.js'), $out.ToString(), $utf8)
"i18n.js yazıldı ($count metin)"
