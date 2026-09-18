$wc = New-Object System.Net.WebClient
$wc.Headers.Add('Content-Type','application/json')
$data = '{"session_id":"geminitest2","message":"What is the capital of France?"}'
try {
  $result = $wc.UploadString('http://localhost:3000/chat','POST',$data)
  Write-Output "SUCCESS: $result"
} catch {
  Write-Output "ERROR: $($_.Exception.Message)"
}