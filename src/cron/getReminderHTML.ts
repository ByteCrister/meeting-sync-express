export const getReminderHTML = (
    username: string,
    title: string,
    dateStr: string,
    durationFrom: string
) => {
    return `
<div style="max-width: 600px; margin: auto; padding: 24px; font-family: Arial, sans-serif; background-color: #ffffff; border: 1px solid #ddd; border-radius: 10px; color: #333;">
  <h2 style="text-align: center; color: #1565c0;">🔔 Meeting Reminder</h2>

  <p style="font-size: 16px;">Hi ${username || "there"},</p>

  <p style="font-size: 16px;">
    This is a friendly reminder that your upcoming meeting titled <strong style="color: #000;">"${title}"</strong> is scheduled to begin at:
  </p>

  <div style="margin: 20px 0; padding: 16px; background-color: #f1f8ff; border-left: 5px solid #1976d2; border-radius: 6px;">
    <p style="margin: 0; font-size: 16px;">
      <strong>Date:</strong> ${dateStr}<br/>
      <strong>Time:</strong> ${durationFrom}
    </p>
  </div>

  <p style="font-size: 15px;">Make sure your calendar is up to date, and join on time to avoid missing anything.</p>

  <p style="font-size: 14px; color: #777; margin-top: 30px;">
    Thanks,<br/>
    <strong style="color: #1565c0;">– The MeetingSync Team</strong>
  </p>
</div>`;
};