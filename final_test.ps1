$wc = New-Object System.Net.WebClient
$wc.Headers.Add('Content-Type','application/json')
$data = '{"session_id":"geminitest1","message":"What is the capital of France?"}'
$result = $wc.UploadString('http://localhost:3000/chat','POST',$data)
Write-Output $result