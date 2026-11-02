const REPORT_TYPE_CSV = 'CSV';
const REPORT_TYPE_HTML = 'HTML';
const ADMIN_ROLE = 'ADMIN';
const STANDARD_USER_ROLE = 'USER';
const ADMIN_PRIORITY_THRESHOLD = 1000;
const STANDARD_USER_VALUE_LIMIT = 500;

function createHeader(reportType, user) {
  if (reportType === REPORT_TYPE_CSV) {
    return 'ID,NOME,VALOR,USUARIO\n';
  }
  if (reportType === REPORT_TYPE_HTML) {
    return (
      '<html><body>\n' +
      '<h1>Relatório</h1>\n' +
      `<h2>Usuário: ${user.name}</h2>\n` +
      '<table>\n' +
      '<tr><th>ID</th><th>Nome</th><th>Valor</th></tr>\n'
    );
  }
  return '';
}

function createFooter(reportType, total) {
  if (reportType === REPORT_TYPE_CSV) {
    return `\nTotal,,\n${total},,\n`;
  }
  if (reportType === REPORT_TYPE_HTML) {
    return `</table>\n<h3>Total: ${total}</h3>\n</body></html>\n`;
  }
  return '';
}

function formatCsvItem(item, user) {
  return `${item.id},${item.name},${item.value},${user.name}\n`;
}

function formatHtmlItem(item, isAdmin) {
  const style = isAdmin && item.priority ? ' style="font-weight:bold;"' : '';
  return `<tr${style}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>\n`;
}

function formatReportItem(reportType, item, user, isAdmin) {
  if (reportType === REPORT_TYPE_CSV) {
    return formatCsvItem(item, user);
  }
  if (reportType === REPORT_TYPE_HTML) {
    return formatHtmlItem(item, isAdmin);
  }
  return null;
}

function formatAdminItem(reportType, user, item) {
  if (item.value > ADMIN_PRIORITY_THRESHOLD) {
    item.priority = true;
  }
  return formatReportItem(reportType, item, user, true);
}

function formatStandardUserItem(reportType, user, item) {
  if (item.value > STANDARD_USER_VALUE_LIMIT) {
    return null;
  }
  return formatReportItem(reportType, item, user, false);
}

const ITEM_FORMATTERS_BY_ROLE = new Map([
  [ADMIN_ROLE, formatAdminItem],
  [STANDARD_USER_ROLE, formatStandardUserItem],
]);

export class ReportGenerator {
  constructor(database) {
    this.db = database;
  }

  /**
   * Gera um relatório de itens baseado no tipo e no usuário.
   * - Admins veem tudo.
   * - Users comuns só veem itens com valor <= 500.
   */
  generateReport(reportType, user, items) {
    let report = createHeader(reportType, user);
    let total = 0;

    for (const item of items) {
      const formatForRole = ITEM_FORMATTERS_BY_ROLE.get(user.role);
      if (formatForRole === undefined) {
        continue;
      }

      const formattedItem = formatForRole(reportType, user, item);
      if (formattedItem === null) {
        continue;
      }

      report += formattedItem;
      total += item.value;
    }

    report += createFooter(reportType, total);

    return report.trim();
  }
}