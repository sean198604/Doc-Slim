$content = Get-Content "C:\Users\Administrator\WorkBuddy\20260413072218\doc-slim\temp.js" -Raw -Encoding UTF8
$newContent = $content.Replace('"📦"', '"⚡"')
[System.IO.File]::WriteAllText("C:\Users\Administrator\WorkBuddy\20260413072218\doc-slim\temp2.js", $newContent, [System.Text.Encoding]::UTF8)
Write-Host "Done"
