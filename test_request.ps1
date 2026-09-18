$client = New-Object System.Net.WebClient
$client.Headers.Add('Content-Type', 'application/json')
$result = $client.UploadString('http://localhost:3000/chat', 'POST', '{"session_id":"geminitest1","message":"What is the capital of France?"}')
Write-Output $result