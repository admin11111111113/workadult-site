# Adds "Studio Catalog" nav link to all HTML pages.
# Inserts the link BEFORE the "vopros.html" (support) nav item.
# Safe: skips pages already containing the link; skips pages without the anchor.
# No Cyrillic in this script to avoid encoding issues. The inserted Russian
# label is written via Unicode escapes.

$ErrorActionPreference = "Stop"
$dir = "C:\Users\admin\Desktop\workadult-site"
Set-Location $dir

# "Каталог студий" as Unicode code points (avoids encoding problems)
$labelChars = 0x041A,0x0430,0x0442,0x0430,0x043B,0x043E,0x0433,0x0020,0x0441,0x0442,0x0443,0x0434,0x0438,0x0439
$label = -join ($labelChars | ForEach-Object { [char]$_ })

$changed = 0; $skipped = 0; $noanchor = 0

Get-ChildItem -Path $dir -Filter *.html -File | ForEach-Object {
    $file = $_.FullName
    $html = Get-Content -LiteralPath $file -Raw -Encoding UTF8

    if ($html -match 'studii-katalog\.html') { $script:skipped++; return }

    $inserted = $false
    $linkAbs = '<a href="/studii-katalog.html">' + $label + '</a>'
    $linkRel = '<a href="studii-katalog.html">'  + $label + '</a>'

    if ($html -match '<a href="/vopros\.html">') {
        $html = [regex]::Replace($html, '(\s*)(<a href="/vopros\.html">)', ('$1' + $linkAbs + '$1$2'), 1)
        $inserted = $true
    }
    elseif ($html -match '<a href="vopros\.html">') {
        $html = [regex]::Replace($html, '(\s*)(<a href="vopros\.html">)', ('$1' + $linkRel + '$1$2'), 1)
        $inserted = $true
    }

    if ($inserted) {
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($file, $html, $utf8)
        $script:changed++
    } else {
        $script:noanchor++
        Write-Host ("No anchor in: " + $_.Name) -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host ("Changed pages   : " + $changed)
Write-Host ("Already had link: " + $skipped)
Write-Host ("No anchor       : " + $noanchor)
