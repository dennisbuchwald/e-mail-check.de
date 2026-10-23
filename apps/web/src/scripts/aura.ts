// Pauses the aura drift while it is off screen (components/Aura.astro).
const observer = new IntersectionObserver((entries) => {
	for (const e of entries) e.target.classList.toggle('is-off', !e.isIntersecting);
});
for (const el of document.querySelectorAll('[data-aura="move"]')) observer.observe(el);
