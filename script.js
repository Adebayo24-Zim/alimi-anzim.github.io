// Configuration : remplacez ce numéro par votre numéro WhatsApp au format international,
// sans +, espace ni tiret.
const WHATSAPP_NUMBER = "22960666056";

document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.textContent = open ? "×" : "☰";
  });
}

const form = document.getElementById("contactForm");
if (form) {
  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const subject = String(data.get("subject") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!name || !email || !message) return;
    const text = `Bonjour, je m'appelle ${name}.\nE-mail : ${email}\nSujet : ${subject}\n\n${message}`;
    const number = WHATSAPP_NUMBER.replace(/\D/g, "");
    const help = document.getElementById("formHelp");
    if (number === "229XXXXXXXX" || number.length < 8) {
      help.textContent = "Le formulaire est prêt. Ajoutez d’abord votre vrai numéro WhatsApp dans le fichier script.js (WHATSAPP_NUMBER), puis réessayez.";
      help.classList.add("error");
      return;
    }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  });
}
