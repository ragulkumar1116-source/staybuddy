/**
  StayBuddy - Dynamic CMS & Branding Content Loader
  Injects Company Name, Logo, Address, Rights, and Page Copy edited by Master Admin across all pages
*/

async function loadDynamicContent() {
  const content = await DB.get('content') || {};
  const settings = await DB.get('settings') || {};
  const menuVisibility = await DB.get('menuVisibility') || {};

  // 1. Dynamic Site Branding & Company Identity
  if (settings.site) {
    const s = settings.site;
    const siteName = s.name || 'StayBuddy';

    // Update document title if site name exists
    if (s.name && !document.title.includes(s.name)) {
      document.title = `${s.name} - ${s.tagline || 'Affordable Stays. Trusted People.'}`;
    }

    document.querySelectorAll('.site-name').forEach(el => el.textContent = siteName);
    document.querySelectorAll('.site-tagline').forEach(el => el.textContent = s.tagline || '');
    document.querySelectorAll('.site-description').forEach(el => el.textContent = s.description || '');
    
    document.querySelectorAll('.site-email').forEach(el => {
      el.textContent = s.contactEmail || '';
      if (el.tagName === 'A') el.href = `mailto:${s.contactEmail}`;
    });

    document.querySelectorAll('.site-phone').forEach(el => {
      el.textContent = s.contactPhone || '';
      if (el.tagName === 'A') el.href = `tel:${s.contactPhone}`;
    });

    document.querySelectorAll('.site-address').forEach(el => el.textContent = s.contactAddress || '');
    document.querySelectorAll('.site-footerText').forEach(el => el.textContent = s.footerText || '');
    document.querySelectorAll('.site-copyright').forEach(el => el.textContent = s.copyright || '');
  }

  // 2. Dynamic Company Logo URL
  if (settings.branding) {
    const b = settings.branding;
    const siteName = settings.site ? settings.site.name : 'StayBuddy';

    if (b.logoUrl && b.logoUrl.trim() !== '') {
      // Update image tags
      document.querySelectorAll('.site-logo-img').forEach(img => {
        img.src = b.logoUrl;
        img.alt = siteName;
      });

      // Update container wrappers if icon is used as fallback
      document.querySelectorAll('.site-logo-container').forEach(container => {
        container.innerHTML = `<img src="${b.logoUrl}" alt="${siteName}" class="site-logo-img" style="max-height: 40px; max-width: 180px; object-fit: contain;">`;
      });
    }
  }

  // 3. Home Page Section Content
  if (content.home) {
    const h = content.home;
    const titleEl = document.getElementById('homeHeroTitle');
    if (titleEl && h.title) titleEl.textContent = h.title;

    const subEl = document.getElementById('homeHeroSubtitle');
    if (subEl && h.subtitle) subEl.textContent = h.subtitle;

    const btn1 = document.getElementById('homeHeroBtn1');
    if (btn1 && h.button1Text) {
      btn1.textContent = h.button1Text;
      if (h.button1Link) btn1.href = h.button1Link;
    }

    const btn2 = document.getElementById('homeHeroBtn2');
    if (btn2 && h.button2Text) {
      btn2.textContent = h.button2Text;
      if (h.button2Link) btn2.href = h.button2Link;
    }

    if (h.bannerUrl) {
      const bannerEl = document.getElementById('homeHeroBanner');
      if (bannerEl) bannerEl.style.backgroundImage = `linear-gradient(135deg, rgba(13, 110, 253, 0.85), rgba(32, 201, 151, 0.85)), url('${h.bannerUrl}')`;
    }

    // Features
    if (h.feature1Title && document.getElementById('feat1Title')) document.getElementById('feat1Title').textContent = h.feature1Title;
    if (h.feature1Desc && document.getElementById('feat1Desc')) document.getElementById('feat1Desc').textContent = h.feature1Desc;
    if (h.feature2Title && document.getElementById('feat2Title')) document.getElementById('feat2Title').textContent = h.feature2Title;
    if (h.feature2Desc && document.getElementById('feat2Desc')) document.getElementById('feat2Desc').textContent = h.feature2Desc;
    if (h.feature3Title && document.getElementById('feat3Title')) document.getElementById('feat3Title').textContent = h.feature3Title;
    if (h.feature3Desc && document.getElementById('feat3Desc')) document.getElementById('feat3Desc').textContent = h.feature3Desc;
  }

  // 4. About Page / Section Content
  if (content.about) {
    const a = content.about;
    if (a.title && document.getElementById('aboutTitle')) document.getElementById('aboutTitle').textContent = a.title;
    if (a.subtitle && document.getElementById('aboutSubtitle')) document.getElementById('aboutSubtitle').textContent = a.subtitle;
    if (a.description && document.getElementById('aboutDesc')) document.getElementById('aboutDesc').textContent = a.description;
    if (settings.branding && settings.branding.aboutImageUrl && document.getElementById('aboutImg')) {
      document.getElementById('aboutImg').src = settings.branding.aboutImageUrl;
    }
  }

  // 5. Safety Section
  if (content.safety) {
    const s = content.safety;
    if (s.title && document.getElementById('safetyTitle')) document.getElementById('safetyTitle').textContent = s.title;
    if (s.subtitle && document.getElementById('safetySubtitle')) document.getElementById('safetySubtitle').textContent = s.subtitle;
    if (s.rules && document.getElementById('safetyRules')) document.getElementById('safetyRules').innerText = s.rules;
    if (settings.branding && settings.branding.safetyImageUrl && document.getElementById('safetyImg')) {
      document.getElementById('safetyImg').src = settings.branding.safetyImageUrl;
    }
  }

  // 6. Legal Content (legal.html)
  if (content.legal) {
    const l = content.legal;
    if (l.terms && document.getElementById('legalTerms')) document.getElementById('legalTerms').innerText = l.terms;
    if (l.privacy && document.getElementById('legalPrivacy')) document.getElementById('legalPrivacy').innerText = l.privacy;
    if (l.guidelines && document.getElementById('legalGuidelines')) document.getElementById('legalGuidelines').innerText = l.guidelines;
    if (l.safetyPolicy && document.getElementById('legalSafetyPolicy')) document.getElementById('legalSafetyPolicy').innerText = l.safetyPolicy;
    if (l.cancellationPolicy && document.getElementById('legalCancellationPolicy')) document.getElementById('legalCancellationPolicy').innerText = l.cancellationPolicy;
    if (l.disclaimer && document.getElementById('legalDisclaimer')) document.getElementById('legalDisclaimer').innerText = l.disclaimer;
  }

  // 7. Menu Visibilities
  Object.keys(menuVisibility).forEach(menuKey => {
    const isVisible = menuVisibility[menuKey];
    document.querySelectorAll(`.nav-menu-${menuKey}`).forEach(navEl => {
      navEl.style.display = isVisible ? 'block' : 'none';
    });
  });
}

document.addEventListener("DOMContentLoaded", loadDynamicContent);
