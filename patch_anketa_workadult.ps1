# patch_anketa_workadult.ps1 - add TrafficStars postback (goalid=4810) on anketa submit
# Run from: C:\Users\admin\Desktop\workadult-site\
$anketaFile = Join-Path $PSScriptRoot "anketa.html"

if (-not (Test-Path $anketaFile)) {
    Write-Host "anketa.html not found in $PSScriptRoot" -ForegroundColor Red
    exit 1
}

$content = Get-Content $anketaFile -Raw -Encoding UTF8

if ($content -match 'ts_postback_workadult') {
    Write-Host "Postback already installed, skipping." -ForegroundColor Yellow
    exit 0
}

$snippet = @"

<script>
/* ts_postback_workadult */
(function(){
  function fireTS() {
    var cid = new URLSearchParams(window.location.search).get('clickid');
    if (!cid) return;
    var url = 'https://tsyndicate.com/api/v1/cpa/action'
            + '?clickid=' + encodeURIComponent(cid)
            + '&goalid=4810'
            + '&key=qJvqKxD1hhE7SMUxBycrXghQz3cOuGFJg1ZS';
    var img = new Image();
    img.src = url;
  }
  var form = document.getElementById('anketa-form') || document.querySelector('form');
  if (form) { form.addEventListener('submit', function(){ fireTS(); }); }
  var btn = document.querySelector('button[type=submit], input[type=submit]');
  if (btn) { btn.addEventListener('click', function(){ fireTS(); }); }
  if (window.location.href.indexOf('clickid') !== -1 &&
      window.location.href.indexOf('thank') !== -1) { fireTS(); }
})();
</script>
"@

if ($content -match '</body>') {
    $content = $content -replace '</body>', "$snippet`n</body>"
    Set-Content $anketaFile $content -Encoding UTF8 -NoNewline
    Write-Host "anketa.html patched - postback workadult (goalid=4810) installed." -ForegroundColor Green
} else {
    Add-Content $anketaFile $snippet -Encoding UTF8
    Write-Host "anketa.html: no body tag, script appended at end." -ForegroundColor Yellow
}
