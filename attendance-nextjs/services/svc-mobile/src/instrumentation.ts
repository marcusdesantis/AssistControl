export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startRemindersCron } = await import('./jobs/reminders')
    startRemindersCron()
  }
}
