// Run only in the private backend environment; never paste keys into source files.
const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error('ELEVENLABS_API_KEY is not configured'); process.exitCode = 1; }
else {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': key, 'accept': 'application/json' },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) {
      console.error('ElevenLabs connection failed. HTTP ' + response.status);
      process.exitCode = 1;
    } else {
      console.log('ElevenLabs authenticated successfully. No audio generated.');
    }
  } catch (error) {
    console.error('ElevenLabs network check failed: ' + error.message);
    process.exitCode = 1;
  }
}
