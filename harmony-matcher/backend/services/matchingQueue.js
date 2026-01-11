// Simple in-process queue for matching jobs.
// Prevents overlapping matching runs and allows safe retries.

const runningEventIds = new Set();
const queuedEventIds = new Set();
const queue = [];
let working = false;

function isQueuedOrRunning(eventId) {
  return runningEventIds.has(eventId) || queuedEventIds.has(eventId);
}

function enqueue(eventId, fn) {
  if (isQueuedOrRunning(eventId)) {
    const err = new Error('Matching already running or queued');
    err.code = 'MATCHING_IN_PROGRESS';
    throw err;
  }

  queuedEventIds.add(eventId);

  return new Promise((resolve, reject) => {
    queue.push({ eventId, fn, resolve, reject });
    processNext();
  });
}

function cancelQueued(eventId) {
  const idx = queue.findIndex((j) => j.eventId === eventId);
  if (idx === -1) return false;
  const [job] = queue.splice(idx, 1);
  queuedEventIds.delete(eventId);
  job.reject(Object.assign(new Error('Cancelled'), { code: 'CANCELLED' }));
  return true;
}

async function processNext() {
  if (working) return;
  const job = queue.shift();
  if (!job) return;

  working = true;
  queuedEventIds.delete(job.eventId);
  runningEventIds.add(job.eventId);

  try {
    const result = await job.fn();
    job.resolve(result);
  } catch (err) {
    job.reject(err);
  } finally {
    runningEventIds.delete(job.eventId);
    working = false;
    // continue
    processNext();
  }
}

module.exports = {
  enqueue,
  cancelQueued,
  isQueuedOrRunning
};



