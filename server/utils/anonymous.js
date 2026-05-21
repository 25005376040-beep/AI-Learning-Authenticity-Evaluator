/**
 * Detect anonymous / unregistered submissions (no student account).
 */
function isAnonymousRecord(record) {
  if (!record) return false;

  const studentId = String(record.studentId || '').trim().toLowerCase();
  const studentName = String(record.studentName || '').trim().toLowerCase();

  if (studentId.includes('anonymous') || studentName.includes('anonymous')) {
    return true;
  }

  // Legacy uploads: no email and not a registered STU-* id
  const hasEmail = Boolean(record.studentEmail?.trim());
  const isRegisteredId = /^stu-/i.test(String(record.studentId || '').trim());
  if (!hasEmail && !isRegisteredId) {
    return true;
  }

  return false;
}

function filterRegistered(records) {
  return records.filter((r) => !isAnonymousRecord(r));
}

module.exports = { isAnonymousRecord, filterRegistered };
