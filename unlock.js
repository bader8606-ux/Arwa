const form = document.getElementById("unlock-form");
const input = document.getElementById("access-code");
const button = document.getElementById("unlock-button");
const error = document.getElementById("error");
const status = document.getElementById("status");
const SESSION = "villa-access-key-v1";
async function unlock(code) {
  error.textContent = "";
  status.textContent = "جارٍ فتح لوحة المشروع…";
  button.disabled = true;
  try {
    if (!/^[A-Za-z0-9_-]{43}$/.test(code))
      throw Error("أدخل رمز الوصول الصحيح أو استخدم رابطك الخاص.");
    if (!window.isSecureContext || !crypto.subtle)
      throw Error("يلزم فتح اللوحة عبر اتصال HTTPS آمن.");
    const bytes = Uint8Array.from(
      atob(code.replace(/-/g, "+").replace(/_/g, "/") + "="),
      (c) => c.charCodeAt(0),
    );
    const key = await crypto.subtle.importKey(
      "raw",
      bytes,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    const response = await fetch("payload.bin", { cache: "no-store" });
    if (!response.ok)
      throw Error("تعذّر تحميل بيانات المشروع. أعد المحاولة لاحقًا.");
    const payload = new Uint8Array(await response.arrayBuffer());
    let plaintext;
    try {
      plaintext = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: payload.slice(0, 12),
          additionalData: new TextEncoder().encode("villa-dashboard-v1"),
        },
        key,
        payload.slice(12),
      );
    } catch {
      throw Error("رمز الوصول غير صحيح أو ملف البيانات غير مكتمل.");
    }
    try {
      sessionStorage.setItem(SESSION, code);
    } catch {}
    if (!location.hash.startsWith("#access="))
      history.replaceState(
        null,
        "",
        location.pathname + location.search + "#access=" + code,
      );
    const html = new TextDecoder().decode(plaintext);
    document.open();
    document.write(html);
    document.close();
  } catch (problem) {
    error.textContent = problem.message;
    status.textContent = "";
    button.disabled = false;
  }
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  unlock(input.value.trim());
});
let code = new URLSearchParams(location.hash.slice(1)).get("access");
if (!code) {
  try {
    code = sessionStorage.getItem(SESSION);
  } catch {}
}
if (code) unlock(code);
