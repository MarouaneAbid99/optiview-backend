type PushMsg = { to: string; title: string; body: string; data?: any; sound?: string };

export async function sendExpoPush(messages: PushMsg[]) {
  if (!messages.length) return;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({ sound: 'default', ...m }));
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      });
    } catch (e) {
      console.error('Expo push failed', e);
    }
  }
}
