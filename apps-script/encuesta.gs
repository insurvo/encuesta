/**
 * Encuesta de validación de Insurvo: recibe cada respuesta, la guarda en una hoja
 * de cálculo y la manda por correo. Para desplegar: script.google.com → proyecto nuevo →
 * pegar este archivo → Implementar → Aplicación web (ejecutar como yo, acceso: cualquier usuario)
 * → copiar la URL en CONFIG.APPS_SCRIPT_URL de index.html. Ejecuta testSetup() una vez para autorizar.
 *
 * Acepta el mismo payload que el script de «Cotiza tu Seguro» (display por secciones) y además
 * el payload crudo de la encuesta en data.survey ({ survey_version, answers }).
 */
var CONFIG = {
  EMAIL: 'CORREO@EJEMPLO.COM',        // a quién llega cada respuesta
  SHEET_NAME: 'Respuestas',
  SPREADSHEET_ID: '',                  // vacío = la hoja vinculada al script
  SUBJECT: 'Encuesta Insurvo · nueva respuesta ({version})',
  TIMEZONE: 'America/New_York',
  BRAND_COLOR: '#2b2d7c',
  ACCENT_COLOR: '#3ee6c4'
};

function doGet() {
  return json_({ ok: true, service: 'insurvo-survey' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var p = JSON.parse(e.postData.contents);
    if (p.website) return json_({ ok: true });                 // trampa para bots
    var survey = (p.data && p.data.survey) || p;
    if (!survey.answers || typeof survey.answers !== 'object') return json_({ ok: false, error: 'empty' });

    lock.waitLock(20000);
    var id = 'ENC-' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
    var row = { 'ID': id, 'Fecha': Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm'), 'Versión': survey.survey_version || '' };
    (p.display || []).forEach(function (section) {
      (section.records || []).forEach(function (rec) {
        rec.forEach(function (f) { row[section.title + ' · ' + f.label] = f.value; });
      });
    });
    row['Respuestas (JSON)'] = JSON.stringify(survey.answers);
    saveRow_(row);
    lock.releaseLock();
    sendEmail_(id, survey, p.display || []);
    return json_({ ok: true, id: id });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  } finally {
    try { lock.releaseLock(); } catch (x) { /* ya liberado */ }
  }
}

function saveRow_(row) {
  var ss = CONFIG.SPREADSHEET_ID ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
  var lastCol = sheet.getLastColumn();
  var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var added = false;
  Object.keys(row).forEach(function (k) { if (headers.indexOf(k) < 0) { headers.push(k); added = true; } });
  if (added) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground(CONFIG.BRAND_COLOR).setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow(headers.map(function (h) { return row[h] == null ? '' : "'" + String(row[h]); }));
}

function sendEmail_(id, survey, display) {
  var c = CONFIG.BRAND_COLOR, a = CONFIG.ACCENT_COLOR;
  var html = ['<div style="font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:0 auto;color:#1d2140;font-size:13px">',
    '<div style="background:' + c + ';color:#fff;padding:18px 20px;border-bottom:4px solid ' + a + '"><div style="font-size:20px;font-weight:bold">Insurvo</div><div style="opacity:.85">Encuesta · ' + esc_(id) + '</div></div>'];
  display.forEach(function (section) {
    html.push('<div style="background:' + c + '1a;color:' + c + ';font-weight:bold;text-transform:uppercase;padding:7px 10px;margin-top:14px">' + esc_(section.title) + '</div><table style="width:100%;border-collapse:collapse">');
    (section.records || []).forEach(function (rec) {
      rec.forEach(function (f) {
        html.push('<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e4ef;color:#5c6080;width:40%">' + esc_(f.label) + '</td><td style="padding:6px 10px;border-bottom:1px solid #e2e4ef;white-space:pre-wrap">' + esc_(f.value) + '</td></tr>');
      });
    });
    html.push('</table>');
  });
  html.push('<p style="color:#5c6080;margin-top:16px">JSON: <code>' + esc_(JSON.stringify(survey.answers)) + '</code></p></div>');
  MailApp.sendEmail(CONFIG.EMAIL, CONFIG.SUBJECT.replace('{version}', survey.survey_version || ''), 'Nueva respuesta ' + id, { htmlBody: html.join(''), name: 'Insurvo' });
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Ejecuta esto una vez desde el editor para autorizar permisos y recibir un correo de prueba. */
function testSetup() {
  doPost({ postData: { contents: JSON.stringify({ data: { survey: { survey_version: 'insurvo-test', answers: { team: 'alone' } } },
    display: [{ title: 'Prueba', records: [[{ id: 'team', label: '¿Trabajas solo o con asistentes?', value: 'Solo' }]] }] }) } });
}
