import emailjs from 'emailjs-com'

const SERVICE_ID = 'service_nv1fajn'
const TEMPLATE_ID = 'template_z2mwd3s'
const PUBLIC_KEY = 'pE85u3fPooYApIHGl'


// 纯文本/HTML发送（不带附件）
export async function sendMailBasic({ to, subject, html }) {
  try {
    const params = {
      to_email: to,
      subject: subject,
      message: html, // 模板里用 {{message}} 接收
    };
    const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, params, PUBLIC_KEY);
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * 带附件发送（使用 sendForm）
 * 需要一个 <form> 元素，其内有：
 *   <input name="to_email">
 *   <input name="subject">
 *   <textarea name="message">
 *   <input type="file" name="attachments" multiple>
 * 模板里无需特别声明附件字段（EmailJS 会把附件转发到邮件）。
 */
export async function sendMailWithForm(formEl) {
  try {
    const result = await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, formEl, PUBLIC_KEY);
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error };
  }
}
