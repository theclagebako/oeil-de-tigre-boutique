(() => {
  "use strict";
  const cfg = window.APP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const money = (value) => {
    const usd = Number(value) || 0;
    const usdText = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD" }).format(usd);
    const rate = Number(cfg.CDF_PER_USD) || 2850;
    const cdfText = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(usd * rate) + " CDF";
    return `${usdText} · env. ${cdfText}`;
  };
  const stockLabel = (stock) => Number(stock) <= 0 ? "Épuisé" : Number(stock) <= 3 ? `Plus que ${stock} en stock` : "En stock";
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("TON-PROJET") &&
    !cfg.SUPABASE_ANON_KEY.includes("COLLE_ICI") &&
    window.supabase;
  const db = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  let products = [];
  let signatureImageUrl = "";
  let detailProduct = null;
  let currentUser = null;
  let toastTimer;

  function toast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }
  function feedback(id, message, error = false) {
    const el = $(id); if (!el) return;
    el.textContent = message; el.classList.toggle("error", error);
  }
  function openDialog(id) { const d = $(id); if (d && !d.open) d.showModal(); }
  function closeDialog(id) { const d = $(id); if (d && d.open) d.close(); }
  function safeText(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function safeImageUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(String(value), window.location.origin);
      if (url.protocol !== "https:" && url.origin !== window.location.origin) return "";
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      return safeText(url.href);
    } catch { return ""; }
  }

  function productImages(product) {
    return [...new Set([product.image_url, ...(Array.isArray(product.gallery_images) ? product.gallery_images : [])].filter(Boolean).map(safeImageUrl).filter(Boolean))].slice(0, 8);
  }
  function productImage(product) {
    const images = productImages(product);
    if (!images.length) return `<div class="no-image">Photo à venir</div>`;
    return `<div class="product-gallery ${images.length === 1 ? "single" : ""}"><img class="gallery-main" src="${images[0]}" alt="${safeText(product.name)}" loading="lazy">${images.length > 1 ? `<div class="gallery-thumbs">${images.map((url, index) => `<button type="button" class="gallery-thumb ${index === 0 ? "active" : ""}" data-gallery-image="${url}" aria-label="Afficher la photo ${index + 1}"><img src="${url}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}</div>`;
  }
  function renderProducts() {
    const grid = $("productGrid");
    if (!products.length) {
      grid.innerHTML = `<div class="empty-state">La collection sera bientôt disponible. Contactez-nous sur WhatsApp pour plus d'informations.</div>`;
      return;
    }
    grid.innerHTML = products.map(p => `
      <article class="product-card" data-product-detail="${safeText(p.id)}" tabindex="0" role="link" aria-label="Voir ${safeText(p.name)}">
        <div class="product-image">${productImage(p)}</div>
        <div class="product-info">
          <h3>${safeText(p.name)}</h3>
          <p class="product-description">${safeText(p.description || "Un bracelet élégant pour votre quotidien.")}</p>
          <div class="product-bottom">
            <div><div class="price">${money(p.price)}</div><div class="stock">${stockLabel(p.stock)}</div></div>
            <button class="button button-dark" data-order="${safeText(p.id)}" ${Number(p.stock) <= 0 ? "disabled" : ""}>${Number(p.stock) <= 0 ? "Épuisé" : "Commander"}</button>
          </div>
        </div>
      </article>`).join("");
    grid.querySelectorAll("[data-order]").forEach(btn => btn.addEventListener("click", e => { e.stopPropagation(); showProductDetail(btn.dataset.order, true); }));
    grid.querySelectorAll("[data-product-detail]").forEach(card => {
      card.addEventListener("click", e => { if (!e.target.closest("[data-gallery-image]")) showProductDetail(card.dataset.productDetail, true); });
      card.addEventListener("keydown", e => { if (e.target === card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); showProductDetail(card.dataset.productDetail, true); } });
    });
    grid.querySelectorAll("[data-gallery-image]").forEach(btn => btn.addEventListener("click", () => {
      const gallery = btn.closest(".product-gallery");
      gallery.querySelector(".gallery-main").src = btn.dataset.galleryImage;
      gallery.querySelectorAll(".gallery-thumb").forEach(thumb => thumb.classList.toggle("active", thumb === btn));
    }));
  }
  function showProductDetail(productId, updateUrl = false) {
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;
    detailProduct = product;
    const floatingWhatsApp = $("floatingWhatsApp");
    if (floatingWhatsApp) floatingWhatsApp.href = "https://wa.me/" + (cfg.WHATSAPP_NUMBER || "243818616951") + "?text=" + encodeURIComponent("Bonjour, je souhaite des informations sur " + product.name + ".");
    const images = productImages(product);
    $("detailProductName").textContent = product.name;
    $("detailProductDescription").textContent = product.description || "Un bracelet élégant pour votre quotidien.";
    $("detailProductPrice").textContent = money(product.price);
    $("detailProductStock").textContent = stockLabel(product.stock);
    $("detailOrderQuantity").max = String(Math.max(1, Math.min(20, Number(product.stock) || 1)));
    $("detailOrderQuantity").disabled = Number(product.stock) <= 0;
    $("detailOrderSubmit").disabled = Number(product.stock) <= 0;
    $("detailOrderQuantity").value = "1";
    $("detailMainImage").src = images[0] || "";
    $("detailMainImage").alt = product.name;
    $("detailGalleryThumbs").innerHTML = images.length > 1 ? images.map((url, i) => `<button type="button" class="detail-gallery-thumb ${i === 0 ? "active" : ""}" data-detail-image="${url}" aria-label="Afficher la photo ${i + 1}"><img src="${url}" alt=""></button>`).join("") : "";
    $("detailGalleryThumbs").querySelectorAll("[data-detail-image]").forEach(button => button.addEventListener("click", () => {
      $("detailMainImage").src = button.dataset.detailImage;
      $("detailGalleryThumbs").querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
    }));
    feedback("detailOrderFeedback", "");
    document.querySelectorAll("main > section").forEach(section => section.hidden = section.id !== "productDetailPage");
    $("productDetailPage").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (updateUrl) history.pushState({ productId }, "", `?produit=${encodeURIComponent(product.id)}`);
  }
  function closeProductDetail(updateUrl = true) {
    detailProduct = null;
    $("productDetailPage").hidden = true;
    document.querySelectorAll("main > section").forEach(section => section.hidden = false);
    if (updateUrl && new URLSearchParams(location.search).has("produit")) history.pushState({}, "", location.pathname);
    $("collection").scrollIntoView({ behavior: "smooth" });
  }
  $("detailBack").addEventListener("click", () => closeProductDetail(true));
  window.addEventListener("popstate", () => {
    const id = new URLSearchParams(location.search).get("produit");
    if (id) showProductDetail(id, false); else closeProductDetail(false);
  });

  let lastOrderAttemptAt = 0;
  function normalizeDRCPhone(value) {
    const compact = String(value || "").trim().replace(/[\s().-]/g, "");
    if (/^0\d{9}$/.test(compact)) return "+243" + compact.slice(1);
    if (/^\+?243\d{9}$/.test(compact)) return "+" + compact.replace(/^\+/, "");
    return "";
  }
  function orderWhatsAppUrl(order) {
    const message = [
      "Bonjour, je souhaite commander :", "",
      "Nom : " + order.customer_name,
      "Téléphone : " + order.customer_phone,
      "Modèle : " + order.product_name,
      "Quantité : " + order.quantity,
      "Prix unitaire : " + money(order.unit_price),
      "Total : " + money(order.total_price),
      "Adresse : " + order.delivery_address
    ].join("\n");
    return "https://wa.me/" + (cfg.WHATSAPP_NUMBER || "243818616951") + "?text=" + encodeURIComponent(message);
  }
  function validateOrderForm(form, order, feedbackId) {
    if (!order.customer_name || !order.customer_phone || !order.delivery_address) {
      feedback(feedbackId, "Veuillez remplir tous les champs.", true); return false;
    }
    const phone = normalizeDRCPhone(order.customer_phone);
    if (!phone) { feedback(feedbackId, "Numéro RDC invalide : utilisez 0XXXXXXXXX ou +243XXXXXXXXX.", true); return false; }
    order.customer_phone = phone;
    if (Date.now() - lastOrderAttemptAt < 12000) {
      feedback(feedbackId, "Patientez quelques secondes avant une nouvelle tentative.", true); return false;
    }
    lastOrderAttemptAt = Date.now();
    return true;
  }


  $("detailOrderForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!detailProduct) return;
    const quantity = Number($("detailOrderQuantity").value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20 || quantity > Number(detailProduct.stock)) {
      feedback("detailOrderFeedback", "Quantité invalide. Stock disponible : " + detailProduct.stock + ".", true); return;
    }
    const order = { customer_name: $("detailCustomerName").value.trim(), customer_phone: $("detailCustomerPhone").value.trim(),
      delivery_address: $("detailCustomerAddress").value.trim(), product_id: detailProduct.id, product_name: detailProduct.name,
      unit_price: Number(detailProduct.price), quantity, total_price: Number(detailProduct.price) * quantity, status: "nouvelle" };
    const form = $("detailOrderForm");
    if (form.elements.website?.value || !validateOrderForm(form, order, "detailOrderFeedback")) return;
    const button = $("detailOrderSubmit");
    const whatsappWindow = window.open("about:blank", "_blank");
    button.disabled = true; button.textContent = "Préparation…";
    let saved = false;
    if (db) {
      try { const { error } = await db.from("orders").insert(order); if (error) throw error; saved = true; }
      catch (err) { console.error("Order insert failed:", err); }
    }
    const url = orderWhatsAppUrl(order);
    if (whatsappWindow) whatsappWindow.location.href = url; else window.location.href = url;
    button.disabled = false; button.textContent = "Enregistrer et ouvrir WhatsApp";
    feedback("detailOrderFeedback", saved ? "Commande enregistrée. Finalisez l’envoi dans WhatsApp." : "La demande sera transmise directement dans WhatsApp. Vérifiez l’envoi du message.", !saved);
  });

  function renderOrderOptions(selectedId = "") {
    const select = $("orderProduct");
    select.innerHTML = products.map(p => `<option value="${safeText(p.id)}">${safeText(p.name)} — ${money(p.price)}</option>`).join("");
    if (selectedId) select.value = selectedId;
  }
  async function loadSignature() {
    if (!db) return;
    const { data, error } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) { console.error("Signature settings:", error); return; }
    if (!data) return;
    signatureImageUrl = data.signature_image_url || "";
    $("signatureEyebrow").textContent = data.signature_eyebrow || "COLLECTION SIGNATURE";
    $("signatureTitle").textContent = data.signature_title || "Œil de Tigre";
    if (safeImageUrl(signatureImageUrl)) $("signatureImage").src = safeImageUrl(signatureImageUrl);
  }

  async function loadProducts() {
    if (!db) {
      products = [];
      const grid = $("productGrid");
      const hasConfig = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
      grid.innerHTML = `<div class="empty-state"><strong>${hasConfig ? "Connexion au catalogue indisponible." : "Catalogue momentanément indisponible."}</strong><p>${hasConfig ? "Le service de données ne s’est pas chargé. Vérifiez votre connexion puis réessayez." : "Notre catalogue est momentanément indisponible. Contactez-nous pour connaître les modèles disponibles."}</p><button class="button button-orange" id="retryCatalog">Réessayer</button> <a class="button button-outline" href="https://wa.me/${cfg.WHATSAPP_NUMBER || "243818616951"}" target="_blank" rel="noopener">WhatsApp</a></div>`;
      $("retryCatalog").addEventListener("click", () => window.location.reload());
      return;
    }
    const grid = $("productGrid");
    grid.innerHTML = Array.from({length: 3}, () => '<div class="loading-card skeleton-card" aria-hidden="true"></div>').join("");
    let result = null, lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await Promise.race([
          db.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Délai dépassé")), 10000))
        ]);
        if (!result.error) { lastError = null; break; }
        lastError = result.error;
      } catch (err) { lastError = err; }
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 700));
    }
    if (!result || result.error || lastError) {
      console.error(lastError || result?.error);
      grid.innerHTML = '<div class="empty-state"><strong>Connexion lente ou indisponible.</strong><p>Vérifiez Internet puis réessayez, ou demandez notre catalogue sur WhatsApp.</p><button class="button button-orange" id="retryCatalog">Réessayer</button> <a class="button button-outline" href="https://wa.me/' + (cfg.WHATSAPP_NUMBER || "243818616951") + '" target="_blank" rel="noopener">WhatsApp</a></div>';
      $("retryCatalog").addEventListener("click", loadProducts);
      return;
    }
    products = (result.data || []).map(product => ({ ...product, price: Number(product.price) }));
    renderProducts(); renderOrderOptions();
  }
  function openOrder(productId = "") {
    renderOrderOptions(productId);
    feedback("orderFeedback", "");
    openDialog("orderDialog");
  }


  $("orderForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = $("orderForm");
    if (form.elements.website?.value) return;
    const product = products.find(p => String(p.id) === String($("orderProduct").value));
    if (!product) { feedback("orderFeedback", "Veuillez choisir un produit.", true); return; }
    const quantity = Number($("orderQuantity").value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20 || quantity > Number(product.stock)) {
      feedback("orderFeedback", "Quantité invalide. Stock disponible : " + product.stock + ".", true); return;
    }
    const order = { customer_name: $("customerName").value.trim(), customer_phone: $("customerPhone").value.trim(),
      delivery_address: $("customerAddress").value.trim(), product_id: product.id, product_name: product.name,
      unit_price: Number(product.price), quantity, total_price: Number(product.price) * quantity, status: "nouvelle" };
    if (!validateOrderForm(form, order, "orderFeedback")) return;
    const submit = form.querySelector('[type="submit"]');
    const whatsappWindow = window.open("about:blank", "_blank");
    submit.disabled = true; submit.textContent = "Préparation…";
    let saved = false;
    if (db) {
      try { const { error } = await db.from("orders").insert(order); if (error) throw error; saved = true; }
      catch (err) { console.error("Order insert failed:", err); }
    }
    const url = orderWhatsAppUrl(order);
    if (whatsappWindow) whatsappWindow.location.href = url; else window.location.href = url;
    submit.disabled = false; submit.textContent = "Enregistrer et ouvrir WhatsApp";
    if (saved) { closeDialog("orderDialog"); form.reset(); toast("Commande enregistrée. Finalisez l’envoi dans WhatsApp."); }
    else feedback("orderFeedback", "La demande sera transmise directement dans WhatsApp. Vérifiez l’envoi du message.", true);
  });

  async function refreshSession() {
    if (!db) return;
    const { data } = await db.auth.getSession();
    currentUser = data.session?.user || null;
    showAdminState();
  }
  function showAdminState() {
    $("adminLoginView").hidden = !!currentUser;
    $("adminPanelView").hidden = !currentUser;
    if (currentUser) { loadAdminProducts(); loadOrders(); loadSignatureAdmin(); }
  }
  async function login(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    currentUser = data.user; showAdminState();
  }
  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!db) return feedback("loginFeedback", "Configurez Supabase avant de vous connecter.", true);
    feedback("loginFeedback", "Connexion…");
    try {
      await login($("adminEmail").value.trim(), $("adminPassword").value);
      $("loginForm").reset(); feedback("loginFeedback", "");
    } catch (err) { feedback("loginFeedback", err.message || "Connexion impossible.", true); }
  });
  $("logoutButton").addEventListener("click", async () => {
    if (db) await db.auth.signOut();
    currentUser = null; showAdminState(); toast("Déconnexion effectuée.");
  });
  if (db) db.auth.onAuthStateChange((_event, session) => { currentUser = session?.user || null; showAdminState(); });

  async function loadSignatureAdmin() {
    const { data, error } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) { feedback("signatureFeedback", "Impossible de charger les réglages de la bannière.", true); return; }
    if (!data) return;
    signatureImageUrl = data.signature_image_url || "";
    $("signatureEyebrowInput").value = data.signature_eyebrow || "COLLECTION SIGNATURE";
    $("signatureTitleInput").value = data.signature_title || "Œil de Tigre";
    $("signatureImagePreview").innerHTML = safeImageUrl(signatureImageUrl) ? `<img src="${safeImageUrl(signatureImageUrl)}" alt="Photo actuelle de la bannière">` : "Aucune photo enregistrée";
  }

  $("signatureForm").addEventListener("submit", async e => {
    e.preventDefault(); if (!currentUser) return;
    const button = $("saveSignatureButton"); button.disabled = true;
    feedback("signatureFeedback", "Enregistrement…");
    try {
      const file = $("signatureImageInput").files?.[0];
      let imageUrl = signatureImageUrl;
      if (file) imageUrl = await uploadImage(file);
      if (!imageUrl) throw new Error("Ajoutez une photo pour la bannière.");
      const record = {
        id: 1,
        signature_eyebrow: $("signatureEyebrowInput").value.trim(),
        signature_title: $("signatureTitleInput").value.trim(),
        signature_image_url: imageUrl,
        updated_at: new Date().toISOString()
      };
      if (!record.signature_eyebrow || !record.signature_title) throw new Error("Remplissez les deux textes.");
      const { error } = await db.from("site_settings").upsert(record, { onConflict: "id" });
      if (error) throw error;
      signatureImageUrl = imageUrl;
      $("signatureEyebrow").textContent = record.signature_eyebrow;
      $("signatureTitle").textContent = record.signature_title;
      $("signatureImage").src = safeImageUrl(imageUrl);
      $("signatureImageInput").value = "";
      $("signatureImagePreview").innerHTML = `<img src="${safeImageUrl(imageUrl)}" alt="Photo actuelle de la bannière">`;
      feedback("signatureFeedback", "Section d’accueil mise à jour avec succès."); toast("Bannière d’accueil mise à jour.");
    } catch (err) { feedback("signatureFeedback", err.message || "Enregistrement impossible.", true); }
    finally { button.disabled = false; }
  });

  async function loadAdminProducts() {
    const list = $("adminProductList");
    const { data, error } = await db.from("products").select("*").order("created_at", { ascending: false });
    if (error) { list.innerHTML = `<p class="muted">Erreur de chargement des produits.</p>`; return; }
    const fixedPriceProducts = (data || []).map(product => ({ ...product, price: Number(product.price) }));
    list.innerHTML = fixedPriceProducts.length ? fixedPriceProducts.map(p => `
      <div class="admin-list-item">
        <div class="admin-list-main">${safeImageUrl(p.image_url) ? `<img src="${safeImageUrl(p.image_url)}" alt="">` : ""}<div><strong>${safeText(p.name)}</strong><small>${money(p.price)} · Stock : ${p.stock} · ${productImages(p).length} photo(s) · ${p.is_active ? "Publié" : "Masqué"}</small></div></div>
        <div class="admin-actions"><button class="button button-outline" data-edit="${p.id}">Modifier</button><button class="button button-outline" data-toggle="${p.id}" data-active="${p.is_active}">${p.is_active ? "Masquer" : "Publier"}</button><button class="button button-outline" data-delete="${p.id}">Supprimer</button></div>
      </div>`).join("") : `<div class="empty-state">Aucun produit. Ajoutez votre premier bracelet ci-dessus.</div>`;
    list.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => editProduct(fixedPriceProducts.find(p => p.id === b.dataset.edit))));
    list.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => toggleProduct(b.dataset.toggle, b.dataset.active === "true")));
    list.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteProduct(b.dataset.delete)));
  }
  function editProduct(p) {
    $("editProductId").value = p.id; $("productName").value = p.name;
    $("productDescription").value = p.description || ""; $("productPrice").value = p.price;
    $("productStock").value = p.stock; $("productActive").checked = p.is_active;
    const currentImages = productImages(p);
    $("existingProductImages").innerHTML = currentImages.length ? `<p class="small muted">Photos déjà enregistrées (${currentImages.length}) — elles seront conservées.</p><div class="admin-gallery-preview">${currentImages.map(url => `<img src="${url}" alt="Photo existante">`).join("")}</div>` : "";
    $("productEditorTitle").textContent = "Modifier le produit";
    $("saveProductButton").textContent = "Enregistrer les modifications";
    $("productForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function resetProductForm() {
    $("productForm").reset(); $("editProductId").value = "";
    $("existingProductImages").innerHTML = "";
    $("productActive").checked = true; $("productStock").value = 0; $("productPrice").value = 5;
    $("productEditorTitle").textContent = "Ajouter un produit";
    $("saveProductButton").textContent = "Enregistrer le produit";
    feedback("productFeedback", "");
  }
  $("resetProductButton").addEventListener("click", resetProductForm);
  async function uploadImage(file) {
    if (!file) return null;
    if (!file.type.startsWith("image/")) throw new Error("Choisissez un fichier image.");
    if (file.size > 5 * 1024 * 1024) throw new Error("L'image doit faire moins de 5 Mo.");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from("product-images").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = db.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  }
  $("productForm").addEventListener("submit", async e => {
    e.preventDefault(); if (!currentUser) return;
    const id = $("editProductId").value;
    const save = $("saveProductButton"); save.disabled = true;
    feedback("productFeedback", "Enregistrement…");
    try {
      const files = Array.from($("productImages").files || []);
      if (files.length > 8) throw new Error("Choisissez 8 photos maximum.");
      const uploadedImages = [];
      for (const file of files) uploadedImages.push(await uploadImage(file));
      const record = {
        name: $("productName").value.trim(),
        description: $("productDescription").value.trim(),
        price: Number($("productPrice").value),
        stock: Number($("productStock").value),
        is_active: $("productActive").checked
      };
      if (!record.name || !Number.isFinite(record.price) || record.price < 0 || !Number.isInteger(record.stock) || record.stock < 0) throw new Error("Vérifiez le nom, le prix et le stock.");
      if (uploadedImages.length) {
        const { data: existing } = id ? await db.from("products").select("image_url,gallery_images").eq("id", id).single() : { data: null };
        const previousImages = existing ? [...new Set([existing.image_url, ...(existing.gallery_images || [])].filter(Boolean))] : [];
        if (previousImages.length + uploadedImages.length > 8) throw new Error(`Il reste ${Math.max(0, 8 - previousImages.length)} emplacement(s) photo(s) pour ce produit.`);
        const allImages = [...previousImages, ...uploadedImages];
        record.image_url = allImages[0] || null;
        record.gallery_images = allImages.slice(1);
      } else if (!id) record.gallery_images = [];
      const result = id ? await db.from("products").update(record).eq("id", id) : await db.from("products").insert(record);
      if (result.error) throw result.error;
      resetProductForm(); await loadAdminProducts(); await loadProducts();
      feedback("productFeedback", "Produit enregistré avec succès."); toast("Produit enregistré.");
    } catch (err) { feedback("productFeedback", err.message || "Erreur lors de l'enregistrement.", true); }
    finally { save.disabled = false; }
  });
  async function toggleProduct(id, active) {
    const { error } = await db.from("products").update({ is_active: !active }).eq("id", id);
    if (error) return toast("Impossible de modifier ce produit.");
    await loadAdminProducts(); await loadProducts(); toast("Visibilité du produit mise à jour.");
  }
  async function deleteProduct(id) {
    if (!confirm("Supprimer définitivement ce produit ?")) return;
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) return toast("Suppression impossible.");
    await loadAdminProducts(); await loadProducts(); toast("Produit supprimé.");
  }
  async function loadOrders() {
    const list = $("adminOrderList");
    const { data, error } = await db.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) { list.innerHTML = `<div class="empty-state">Impossible de charger les commandes.</div>`; return; }
    list.innerHTML = data.length ? data.map(o => `
      <div class="admin-list-item"><div><strong>${safeText(o.product_name)} × ${o.quantity}</strong><small>${safeText(o.customer_name)} · ${safeText(o.customer_phone)} · ${money(o.total_price)}<br>${safeText(o.delivery_address)}<br>${new Date(o.created_at).toLocaleString("fr-FR")}</small></div><div class="admin-actions"><select aria-label="Statut de commande" data-status="${o.id}"><option ${o.status==="nouvelle"?"selected":""}>nouvelle</option><option ${o.status==="confirmée"?"selected":""}>confirmée</option><option ${o.status==="livrée"?"selected":""}>livrée</option><option ${o.status==="annulée"?"selected":""}>annulée</option></select></div></div>`).join("") : `<div class="empty-state">Aucune commande pour le moment.</div>`;
    list.querySelectorAll("[data-status]").forEach(s => s.addEventListener("change", async () => {
      const { error } = await db.from("orders").update({ status: s.value }).eq("id", s.dataset.status);
      if (error) toast("Impossible de mettre à jour la commande."); else toast("Statut de commande mis à jour.");
    }));
  }

  $("adminShortcut").addEventListener("click", async () => {
    if (!db) { toast("Configurez d'abord Supabase dans config.js."); return; }
    await refreshSession(); openDialog("adminDialog");
  });
  $("headerOrder").addEventListener("click", () => { if (!$("productDetailPage").hidden) closeProductDetail(false); $("collection").scrollIntoView({ behavior: "smooth" }); });
  $("contactWhatsApp").href = `https://wa.me/${cfg.WHATSAPP_NUMBER || "243818616951"}`;
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeDialog(b.dataset.close)));
  ["orderDialog","adminDialog"].forEach(id => $(id).addEventListener("click", e => { if (e.target === $(id)) closeDialog(id); }));
  document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === tab));
    ["productsTab","signatureTab","ordersTab"].forEach(id => $(id).hidden = id !== tab.dataset.tab);
  }));
  $("year").textContent = new Date().getFullYear();
  // Nav mobile
  const nav = document.querySelector(".main-nav");
  const menuToggle = $("menuToggle");
  function setMenuOpen(open) {
    nav.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  }
  menuToggle.addEventListener("click", () => setMenuOpen(!nav.classList.contains("open")));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenuOpen(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setMenuOpen(false); });
  document.addEventListener("click", e => {
    if (!nav.contains(e.target) && !menuToggle.contains(e.target)) setMenuOpen(false);
  });
  if (cfg.HERO_IMAGE_URL && safeImageUrl(cfg.HERO_IMAGE_URL)) $("signatureImage").src = safeImageUrl(cfg.HERO_IMAGE_URL);
  loadProducts().then(() => {
    const productId = new URLSearchParams(window.location.search).get("produit");
    if (productId) showProductDetail(productId, false);
  });
  loadSignature();
  // Ouvre directement l'espace admin après une connexion depuis /admin.html.
  if (new URLSearchParams(window.location.search).get("admin") === "1") {
    (async () => {
      if (db) await refreshSession();
      openDialog("adminDialog");
      history.replaceState({}, "", window.location.pathname);
    })();
  }
})();
