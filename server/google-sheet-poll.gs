/** @OnlyCurrentDoc */
// The future page's question on GitHub Pages, which cannot run server/poll.mjs: the answers go to a Google Sheet through
// this Apps Script, deployed as a web app. It answers the page with the same shape as poll.mjs,
// { question, counts: { yes, maybe, no }, total, mine }, and keeps one answer per browser in the same way: the page's
// random id, stored only as a salted hash. Apps Script never sees the reader's address.
//
// Set up (once):
//   1. Make a Google Sheet, then Extensions › Apps Script, and paste this file in place of the starter code.
//   2. Run `setup` once from the editor (choose it in the function list, press Run, allow access). It makes the
//      "Votes" tab (one row per answer) and the "Results" tab (counts and percentages, updating by themselves).
//   3. Deploy › New deployment › Web app, "Execute as: Me", "Who has access: Anyone". Copy the web app URL.
//   4. Give the URL to the site's build: `gh variable set POLL_URL --body "<url>"`, then rerun the Pages workflow.
// After editing this script, Deploy › Manage deployments › edit › New version keeps the same URL.
//
//   GET  ?voter=ID                         → the totals, and this browser's answer if it has one
//   POST {"action":"vote","voter","choice"} → the same, after recording the answer (unchanged if already answered)
//   POST {"action":"reset","voter"}         → the same, after withdrawing this browser's answer (the page's Reset)

const QUESTION = 'exists'
const ANSWERS = ['yes', 'maybe', 'no']
const VOTES = 'Votes'
const RESULTS = 'Results'

function setup () {
  const book = SpreadsheetApp.getActiveSpreadsheet()
  const votes = book.getSheetByName(VOTES) || book.insertSheet(VOTES)
  votes.getRange(1, 1, 1, 3).setValues([['Time', 'Browser (hashed)', 'Answer']]).setFontWeight('bold')
  votes.setFrozenRows(1)
  const res = book.getSheetByName(RESULTS) || book.insertSheet(RESULTS, 0)
  res.clear()
  res.getRange(1, 1, 5, 3).setValues([
    ['Do you think Planet Nine exists?', 'Answers', 'Share'],
    ['Yes', `=COUNTIF(${VOTES}!C2:C, "yes")`, '=IFERROR(B2/B$5, 0)'],
    ['Maybe', `=COUNTIF(${VOTES}!C2:C, "maybe")`, '=IFERROR(B3/B$5, 0)'],
    ['No', `=COUNTIF(${VOTES}!C2:C, "no")`, '=IFERROR(B4/B$5, 0)'],
    ['Total', '=SUM(B2:B4)', '=IFERROR(B5/B$5, 0)'],
  ])
  res.getRange('A1:C1').setFontWeight('bold')
  res.getRange('A5:C5').setFontWeight('bold')
  res.getRange('C2:C5').setNumberFormat('0.0%')
  res.autoResizeColumns(1, 3)
  salt_()
}

function doGet (e) {
  const voter = e && e.parameter && e.parameter.voter
  return json_(results_(valid_(voter) ? hash_(voter) : null))
}

function doPost (e) {
  let body
  try { body = JSON.parse(e.postData.contents) } catch (err) { return json_({ error: 'bad body' }) }
  if (!valid_(body.voter)) return json_({ error: 'bad voter' })
  const key = hash_(body.voter)
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const votes = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VOTES)
    const row = rowOf_(votes, key)
    if (body.action === 'reset') {
      if (row) votes.deleteRow(row)
    } else if (body.action === 'vote') {
      if (ANSWERS.indexOf(body.choice) < 0) return json_({ error: 'unknown answer' })
      if (!row) votes.appendRow([new Date(), key, body.choice])
    } else {
      return json_({ error: 'unknown action' })
    }
    SpreadsheetApp.flush()
  } finally {
    lock.releaseLock()
  }
  return json_(results_(key))
}

/** The counts from the Votes tab, and this browser's answer. */
function results_ (key) {
  const votes = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VOTES)
  const counts = { yes: 0, maybe: 0, no: 0 }
  let mine = null
  const n = votes.getLastRow() - 1
  if (n > 0) {
    for (const [, who, c] of votes.getRange(2, 1, n, 3).getValues()) {
      if (c in counts) counts[c]++
      if (key && who === key) mine = c
    }
  }
  return { question: QUESTION, counts, total: counts.yes + counts.maybe + counts.no, mine }
}

function rowOf_ (votes, key) {
  const n = votes.getLastRow() - 1
  if (n < 1) return 0
  const i = votes.getRange(2, 2, n, 1).getValues().findIndex(r => r[0] === key)
  return i < 0 ? 0 : i + 2
}

const valid_ = id => typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id)

function salt_ () {
  const props = PropertiesService.getScriptProperties()
  let s = props.getProperty('salt')
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('salt', s) }
  return s
}

function hash_ (id) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, `${salt_()}:${id}`)
  return bytes.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('').slice(0, 32)
}

const json_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
