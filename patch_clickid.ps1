# patch_clickid.ps1 - proxy clickid into anketa links across all landing pages
# Run from: C:\Users\admin\Desktop\workadult-site\
$siteDir = $PSScriptRoot
$patched = 0
$skipped = 0

$snippet = @'

<script>
(function(){
  var p = new URLSearchParams(window.location.search);
  var cid = p.get('clickid');
  if (!cid) return;
  document.querySelectorAll('a[href*="anketa"]').forEach(function(a){
    try {
      var u = new URL(a.href, location.origin);
      u.searchParams.set('clickid', cid);
      a.href = u.toString();
    } catch(e){}
  });
})();
</script>
'@

$files = Get-ChildItem -Path $siteDir -Filter "*.html" -Recurse | Where-Object { $_.Name -ne "anketa.html" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    if ($content -match 'anketa' -and $content -notmatch 'patch_clickid_done') {
        if ($content -match '</body>') {
            $marker = "`n<!-- patch_clickid_done -->"
            $content = $content -replace '</body>', "$snippet$marker`n</body>"
            Set-Content $file.FullName $content -Encoding UTF8 -NoNewline
            Write-Host "PATCHED: $($file.Name)" -ForegroundColor Green
            $patched++
        } else {
            Write-Host "NO body tag: $($file.Name)" -ForegroundColor Yellow
            $skipped++
        }
    } else {
        $skipped++
    }
}

Write-Host ""
Write-Host "Done: $patched patched, $skipped skipped." -ForegroundColor Cyan
