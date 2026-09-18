$wc = New-Object System.Net.WebClient
try {
  $wc.Timeout = 5000
  $result = $wc.DownloadString('http://localhost:3000/chat')
  Write-Output $result
} catch {
  Write-Output "Error: $($_.Exception.Message)"
}