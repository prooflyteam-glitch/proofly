(function () {
  // 1. Aggressive Product ID Extraction
  // This ensures it works seamlessly across custom setups and major e-commerce platforms
  function getProductId() {
    // Check URL parameters first (easiest override)
    const urlId = new URLSearchParams(window.location.search).get('productId');
    if (urlId) return urlId;

    // Check Shopify global objects
    if (window?.meta?.product?.id) return window.meta.product.id;
    if (window?.__st?.rid) return window.__st.rid; 

    // Check standard Meta Tags (OpenGraph)
    const ogId = document.querySelector('meta[property="og:product:id"]')?.content;
    if (ogId) return ogId;

    // Check JSON-LD Structured Data (Google's standard for product pages)
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (let script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'Product' && data.sku) return data.sku;
      } catch (e) {
        // Ignore parsing errors
      }
    }
    return null;
  }

  const productId = getProductId();

  if (!productId) {
    console.log('Proofly: No product ID detected. Widget will not load on this page.');
    return;
  }

  // ⚠️ IMPORTANT: Replace this with your actual Vercel production URL before deploying
  const BACKEND_URL = 'https://your-actual-vercel-domain.vercel.app'; 

  // 2. Fetch approved video reviews for this specific product
  fetch(`${BACKEND_URL}/api/reviews/get-approved?productId=${productId}`)
    .then((res) => res.json())
    .then((data) => {
      if (!data.reviews || data.reviews.length === 0) return;
      createWidget(data.reviews[0]); // Render the most recent approved review
    })
    .catch((err) => console.error('Proofly load error:', err));

  // 3. Inject the Premium Video Widget
  function createWidget(review) {
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'proofly-widget-root';
    
    // Sleek, modern styling to align with a premium aesthetic
    Object.assign(widgetContainer.style, {
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      width: '130px',
      height: '190px',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
      zIndex: '999999',
      cursor: 'pointer',
      border: '2px solid rgba(255, 255, 255, 0.9)',
      backgroundColor: '#111',
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      display: 'flex',
      flexDirection: 'column'
    });

    // The Video Player
    const videoElement = document.createElement('video');
    videoElement.src = `${BACKEND_URL}/api/stream?fileId=${review.google_drive_file_id}`; 
    videoElement.autoplay = true;
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    Object.assign(videoElement.style, {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      transition: 'opacity 0.3s ease'
    });

    // Trust Badge Overlay (Adds authority)
    const badgeElement = document.createElement('div');
    badgeElement.innerHTML = `
      <span style="color:#FFB800; font-size:12px;">★</span>
      <span style="font-weight:600;">Verified</span>
    `;
    Object.assign(badgeElement.style, {
      position: 'absolute',
      bottom: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      color: '#fff',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '10px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      pointerEvents: 'none',
      transition: 'all 0.3s ease'
    });

    // Close Button (Hidden by default)
    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '✕';
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      width: '30px',
      height: '30px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      color: '#fff',
      borderRadius: '50%',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontFamily: 'sans-serif',
      backdropFilter: 'blur(4px)',
      zIndex: '10'
    });

    // Interaction Logic: Expand / Collapse
    let isExpanded = false;

    widgetContainer.addEventListener('click', (e) => {
      // Prevent collapse if clicking the close button directly
      if (e.target === closeBtn) return;

      isExpanded = !isExpanded;

      if (isExpanded) {
        // Expand to viewing mode
        videoElement.muted = false;
        videoElement.currentTime = 0; // Restart video for full attention
        Object.assign(widgetContainer.style, {
          width: '320px',
          height: '540px',
          bottom: '32px',
          left: '32px',
          borderRadius: '24px'
        });
        badgeElement.style.opacity = '0'; // Hide badge when expanded
        closeBtn.style.display = 'flex';  // Show close button
      }
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop the container click event
      isExpanded = false;
      videoElement.muted = true;
      Object.assign(widgetContainer.style, {
        width: '130px',
        height: '190px',
        bottom: '24px',
        left: '24px',
        borderRadius: '16px'
      });
      badgeElement.style.opacity = '1';
      closeBtn.style.display = 'none';
    });

    // Assemble the widget
    widgetContainer.appendChild(videoElement);
    widgetContainer.appendChild(badgeElement);
    widgetContainer.appendChild(closeBtn);
    document.body.appendChild(widgetContainer);
  }
})();
