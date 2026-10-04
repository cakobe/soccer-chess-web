# Sitedeki çevrilecek Türkçe metinleri çıkarır ve i18n\kaynak.txt dosyasına "N|metin" biçiminde yazar.
# Kullanım: powershell -File tools\i18n-cikar.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Normalize([string]$s) {
  return ([regex]::Replace($s, '\s+', ' ')).Trim()
}

$seen = New-Object 'System.Collections.Generic.HashSet[string]'
$list = New-Object 'System.Collections.Generic.List[string]'
function Add-Segment([string]$s) {
  $n = Normalize $s
  if ($n -notmatch '\p{L}') { return }
  if ($seen.Add($n)) { $list.Add($n) }
}

# --- index.html: metin düğümleri ve seçili öznitelikler
$html = [IO.File]::ReadAllText((Join-Path $root 'index.html'), $utf8)
$html = [regex]::Replace($html, '(?s)<script\b.*?</script>', '')
$html = [regex]::Replace($html, '(?s)<style\b.*?</style>', '')
$html = [regex]::Replace($html, '(?s)<!--.*?-->', '')

foreach ($m in [regex]::Matches($html, '(?s)<title>(.*?)</title>')) { Add-Segment $m.Groups[1].Value }
foreach ($m in [regex]::Matches($html, '<meta name="description" content="([^"]*)"')) { Add-Segment $m.Groups[1].Value }
foreach ($m in [regex]::Matches($html, '(?s)>([^<]+)<')) { Add-Segment $m.Groups[1].Value }
foreach ($m in [regex]::Matches($html, '\b(?:placeholder|alt|aria-label|title)="([^"]+)"')) { Add-Segment $m.Groups[1].Value }

# --- anket.js ve hakem.js: görünen metin içeren tek tırnaklı dizgeler
foreach ($file in 'anket.js', 'hakem.js') {
  $js = [IO.File]::ReadAllText((Join-Path $root $file), $utf8)
  $js = [regex]::Replace($js, '(?m)^\s*//.*$', '')
  foreach ($m in [regex]::Matches($js, "'((?:[^'\\\r\n]|\\.)*)'")) {
    $v = $m.Groups[1].Value.Replace("\'", "'")
    if ($v -cmatch '^[a-z_\-/ .:#=\[\]][a-z0-9_\-/ .:#=\[\]]*$') { continue }      # sınıf adları, seçiciler
    if ($v -cmatch '^[A-Za-z0-9\-/]+$' -and $v -cnotmatch '^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+$') { continue }  # POST, Content-Type, ABC...
    Add-Segment $v
  }
}

$out = New-Object System.Text.StringBuilder
for ($i = 0; $i -lt $list.Count; $i++) { [void]$out.Append("$i|$($list[$i])`n") }
$dir = Join-Path $root 'i18n'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory $dir | Out-Null }
[IO.File]::WriteAllText((Join-Path $dir 'kaynak.txt'), $out.ToString(), $utf8)
"Toplam $($list.Count) metin -> i18n\kaynak.txt"
