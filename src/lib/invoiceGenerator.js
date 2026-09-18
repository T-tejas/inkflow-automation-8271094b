function generateInvoiceHTML(data) {
  const formattedPrice = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(data.tattooPrice);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${data.clientId}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; }
    .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; margin: 0; letter-spacing: 2px; }
    .header p { margin: 4px 0; color: #666; font-size: 12px; }
    .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .invoice-meta div { font-size: 13px; }
    .invoice-meta strong { display: block; font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f5f5f5; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; color: #666; border-bottom: 2px solid #ddd; }
    td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 14px; }
    .total { text-align: right; font-size: 20px; font-weight: bold; }
    .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>F19 TATTOO STUDIO</h1>
    <p>Professional Tattoo Art & Design</p>
    <p>Invoice</p>
  </div>
  
  <div class="invoice-meta">
    <div>
      <strong>Client</strong>
      ${data.clientName}<br>
      ${data.phone}<br>
      ID: ${data.clientId}
    </div>
    <div style="text-align: right;">
      <strong>Date</strong>
      ${data.date}<br>
      <strong>Artist</strong>
      ${data.artistName}
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          Tattoo Service${data.tattooStyle ? ` \u2014 ${data.tattooStyle}` : ""}
          ${data.placement ? `<br><small style="color:#888">Placement: ${data.placement}</small>` : ""}
        </td>
        <td style="text-align:right">${formattedPrice}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="total">
    Total: ${formattedPrice}
  </div>
  
  <div class="footer">
    <p>Thank you for choosing F19 Tattoo Studio!</p>
    <p>This is a computer-generated invoice.</p>
  </div>
</body>
</html>`;
}
function downloadInvoice(html, clientId) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice-${clientId}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
export {
  downloadInvoice,
  generateInvoiceHTML
};
