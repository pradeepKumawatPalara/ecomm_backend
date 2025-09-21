const passport = require('passport');
const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.STANDARD_MAIL, // gmail
    pass: process.env.MAIL_PASSWORD, // pass
  },
});



exports.isAuth = () => {
  return (req, res, next) => {
    passport.authenticate("jwt", { session: false }, (err, user, info) => {
      if (err) return next(err);

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      req.user = user; // attach user to request object
      next();
    })(req, res, next);
  };
};


exports.sanitizeUser = (user) => {
  return { id: user.id, role: user.role };
};

exports.cookieExtractor = function (req) {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['jwt'];
  }
  return token;
};


exports.sendMail = async function ({to, subject, text, html}){
    let info = await transporter.sendMail({
        from: '"E-commerce" <Pradeep Kumawat>', // sender address
        to,
        subject,
        text,
        html
      });
    return info;  
}

exports.invoiceTemplate = function (order) {
  console.log("jjhh", order);

  return (`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>Email Receipt</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style type="text/css">
    body, table, td, a { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table, td { mso-table-rspace: 0pt; mso-table-lspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }
    a[x-apple-data-detectors] { font-family: inherit !important; font-size: inherit !important; font-weight: inherit !important; line-height: inherit !important; color: inherit !important; text-decoration: none !important; }
    div[style*="margin: 16px 0;"] { margin: 0 !important; }
    body { width: 100% !important; height: 100% !important; padding: 0 !important; margin: 0 !important; }
    table { border-collapse: collapse !important; }
    a { color: #1a82e2; }
    img { height: auto; line-height: 100%; text-decoration: none; border: 0; outline: none; }
  </style>
</head>
<body style="background-color: #D2C7BA;">
  <div class="preheader" style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    A preheader is the short summary text that follows the subject line when an email is viewed in the inbox.
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%">

    <tr>
      <td align="center" bgcolor="#D2C7BA">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td align="center" valign="top" style="padding: 36px 24px;">
              <a href="https://sendgrid.com" target="_blank" style="display: inline-block;">
                <img src="./img/paste-logo-light@2x.png" alt="Logo" border="0" width="48" style="display: block; width: 48px; max-width: 48px; min-width: 48px;">
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td align="center" bgcolor="#D2C7BA">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 3px solid #d4dadf;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;">Thank you for your order!</h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td align="center" bgcolor="#D2C7BA">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">

          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
              <p style="margin: 0;">Here is a summary of your recent order. If you have any questions or concerns about your order, please <a href="coderdost@gmail.com">contact us</a>.</p>
            </td>
          </tr>

          <tr>
            <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" bgcolor="#D2C7BA" width="60%" style="padding: 12px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;"><strong>Order #</strong></td>
                  <td align="left" bgcolor="#D2C7BA" width="20%" style="padding: 12px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;"></td>
                  <td align="left" bgcolor="#D2C7BA" width="20%" style="padding: 12px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;"><strong>${order.id}</strong></td>
                </tr>

                ${order.items.map(item => `
                  <tr>
                    <td align="left" width="60%" style="padding: 6px 12px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                      ${item.product.title}
                    </td>
                    <td align="left" width="20%" style="padding: 6px 12px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                      ${item.quantity}
                    </td>
                    <td align="left" width="20%" style="padding: 6px 12px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                      ₹${item.product.discountedPrice}
                    </td>
                  </tr>
                `).join('')}

                <tr>
                  <td align="left" width="60%" style="padding: 12px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-top: 2px dashed #D2C7BA; border-bottom: 2px dashed #D2C7BA;"><strong>Total</strong></td>
                  <td align="left" width="20%" style="padding: 12px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-top: 2px dashed #D2C7BA; border-bottom: 2px dashed #D2C7BA;"><strong>${order.totalItems}</strong></td>
                  <td align="left" width="20%" style="padding: 12px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-top: 2px dashed #D2C7BA; border-bottom: 2px dashed #D2C7BA;"><strong>₹${order.totalAmount}</strong></td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>

    <tr>
      <td align="center" bgcolor="#D2C7BA" style="padding: 36px 24px;">
        <p style="margin: 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #333333;">&copy; 2025 E-commerce. All Rights Reserved.</p>
      </td>
    </tr>

  </table>

</body>
</html>`);
};
