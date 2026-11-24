/**
 * PathShift — Google Sheets Backup Webhook (Google Apps Script)
 *
 * Setup:
 * 1. Create a Google Sheet with a tab named "Leads".
 * 2. Open Extensions -> Apps Script and paste this file into Code.gs.
 * 3. Go to Project Settings -> Script Properties and add:
 *      SHEETS_WEBHOOK_SECRET = <your strong random secret>
 * 4. Click Deploy -> New deployment -> Web app:
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Copy the Web App URL into Supabase Edge Function secret SHEETS_WEBHOOK_URL,
 *    and the same secret into SHEETS_WEBHOOK_SECRET.
 */

var SHEET_NAME = 'Leads';
var HEADERS = [
  'Lead ID',
  'Created',
  'First Name',
  'Email',
  'Age',
  'Country',
  'Track',
  'Current Job',
  'Fulfilment',
  'Top 3 Options',
  'Chosen Path',
  'Status',
  'WhatsApp Clicked At',
  'Last Updated',
];

function getOrCreateLeadsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var data = JSON.parse(rawBody);

    var expectedSecret = PropertiesService.getScriptProperties().getProperty(
      'SHEETS_WEBHOOK_SECRET'
    );
    if (!expectedSecret || data.secret !== expectedSecret) {
      return jsonOut_({ ok: false, error: 'Unauthorized' });
    }

    var leadId = String(data.lead_id || '').trim();
    if (!leadId) {
      return jsonOut_({ ok: false, error: 'Missing lead_id' });
    }

    var sheet = getOrCreateLeadsSheet_();
    var rowValues = [
      leadId,
      data.created_at || '',
      data.first_name || '',
      data.email || '',
      data.age !== undefined && data.age !== null ? data.age : '',
      data.country || '',
      data.track || '',
      data.current_title || '',
      data.fulfilment !== undefined && data.fulfilment !== null ? data.fulfilment : '',
      data.top_3_options || '',
      data.chosen_path || '',
      data.status || 'started',
      data.whatsapp_clicked_at || '',
      data.updated_at || new Date().toISOString(),
    ];

    var lastRow = sheet.getLastRow();
    var matchedRowIndex = -1;

    if (lastRow >= 2) {
      var idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < idColumnValues.length; i++) {
        if (String(idColumnValues[i][0]).trim() === leadId) {
          matchedRowIndex = i + 2;
          break;
        }
      }
    }

    if (matchedRowIndex > 0) {
      sheet.getRange(matchedRowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      return jsonOut_({ ok: true, action: 'updated', row: matchedRowIndex });
    } else {
      sheet.appendRow(rowValues);
      return jsonOut_({ ok: true, action: 'inserted', row: sheet.getLastRow() });
    }
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
