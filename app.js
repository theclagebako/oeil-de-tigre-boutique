(() => {
  "use strict";
  const cfg = window.APP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const money = (value) => `${new Intl.NumberFormat("fr-FR").format(Number(value) || 0)} ${cfg.CURRENCY_LABEL || "FC"}`;
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("TON-PROJET") &&
    !cfg.SUPABASE_ANON_KEY.includes("COLLE_ICI") &&
    window.supabase;
  const db = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  let products = [];
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

  function productImage(product) {
    if (product.image_url) return `<img src="${safeText(product.image_url)}" alt="${safeText(product.name)}" loading="lazy">`;
    return `<div class="no-image">Photo à venir</div>`;
  }
  function renderProducts() {
    const grid = $("productGrid");
    if (!products.length) {
      grid.innerHTML = `<div class="empty-state">La collection sera bientôt disponible. Contactez-nous sur WhatsApp pour plus d'informations.</div>`;
      return;
    }
    grid.innerHTML = products.map(p => `
      <article class="product-card">
        <div class="product-image">${productImage(p)}</div>
        <div class="product-info">
          <h3>${safeText(p.name)}</h3>
          <p class="product-description">${safeText(p.description || "Un bracelet élégant pour votre quotidien.")}</p>
          <div class="product-bottom">
            <div><div class="price">${money(p.price)}</div><div class="stock">${p.stock > 0 ? `${p.stock} disponible(s)` : "Disponible sur demande"}</div></div>
            <button class="button button-dark" data-order="${safeText(p.id)}">Commander</button>
          </div>
        </div>
      </article>`).join("");
    grid.querySelectorAll("[data-order]").forEach(btn => btn.addEventListener("click", () => openOrder(btn.dataset.order)));
  }
  function renderOrderOptions(selectedId = "") {
    const select = $("orderProduct");
    select.innerHTML = products.map(p => `<option value="${safeText(p.id)}">${safeText(p.name)} — ${money(p.price)}</option>`).join("");
    if (selectedId) select.value = selectedId;
  }
  async function loadProducts() {
    if (!db) {
      products = [];
      $("productGrid").innerHTML = `<div class="empty-state">La boutique est prête. Pour afficher les produits, configurez les identifiants Supabase dans <strong>config.js</strong> et exécutez le script SQL fourni.</div>`;
      return;
    }
    const { data, error } = await db.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false });
    if (error) {
      $("productGrid").innerHTML = `<div class="empty-state">Impossible de charger la collection. Vérifiez la configuration Supabase et les règles SQL.</div>`;
      console.error(error); return;
    }
    products = data || []; renderProducts(); renderOrderOptions();
  }
  function openOrder(productId = "") {
    if (!db) { toast("La boutique doit d'abord être connectée à Supabase."); return; }
    renderOrderOptions(productId);
    feedback("orderFeedback", "");
    openDialog("orderDialog");
  }

  $("orderForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!db) return;
    const product = products.find(p => p.id === $("orderProduct").value);
    if (!product) { feedback("orderFeedback", "Veuillez choisir un produit.", true); return; }
    const quantity = Number($("orderQuantity").value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      feedback("orderFeedback", "La quantité doit être comprise entre 1 et 20.", true); return;
    }
    const order = {
      customer_name: $("customerName").value.trim(),
      customer_phone: $("customerPhone").value.trim(),
      delivery_address: $("customerAddress").value.trim(),
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity,
      total_price: Number(product.price) * quantity,
      status: "nouvelle"
    };
    if (!order.customer_name || !order.customer_phone || !order.delivery_address) {
      feedback("orderFeedback", "Veuillez remplir tous les champs.", true); return;
    }
    const whatsappWindow = window.open("about:blank", "_blank");
    const submit = $("orderForm").querySelector('[type="submit"]');
    submit.disabled = true; submit.textContent = "Enregistrement…";
    const { error } = await db.from("orders").insert(order);
    submit.disabled = false; submit.textContent = "Enregistrer et ouvrir WhatsApp";
    if (error) {
      console.error(error);
      if (whatsappWindow) whatsappWindow.close();
      feedback("orderFeedback", "La commande n'a pas pu être enregistrée. Réessayez ou contactez-nous directement.", true);
      return;
    }
    const message = [
      "Bonjour, je souhaite commander :",
      "",
      `Nom : ${order.customer_name}`,
      `Téléphone : ${order.customer_phone}`,
      `Modèle : ${order.product_name}`,
      `Quantité : ${quantity}`,
      `Prix unitaire : ${money(product.price)}`,
      `Total : ${money(order.total_price)}`,
      `Adresse : ${order.delivery_address}`
    ].join("\n");
    const url = `https://wa.me/${cfg.WHATSAPP_NUMBER || "243818616951"}?text=${encodeURIComponent(message)}`;
    if (whatsappWindow) whatsappWindow.location.href = url;
    else window.location.href = url;
    closeDialog("orderDialog"); $("orderForm").reset(); toast("Commande enregistrée. WhatsApp va s'ouvrir.");
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
    if (currentUser) { loadAdminProducts(); loadOrders(); }
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

  async function loadAdminProducts() {
    const list = $("adminProductList");
    const { data, error } = await db.from("products").select("*").order("created_at", { ascending: false });
    if (error) { list.innerHTML = `<p class="muted">Erreur de chargement des produits.</p>`; return; }
    list.innerHTML = data.length ? data.map(p => `
      <div class="admin-list-item">
        <div class="admin-list-main">${p.image_url ? `<img src="${safeText(p.image_url)}" alt="">` : ""}<div><strong>${safeText(p.name)}</strong><small>${money(p.price)} · Stock : ${p.stock} · ${p.is_active ? "Publié" : "Masqué"}</small></div></div>
        <div class="admin-actions"><button class="button button-outline" data-edit="${p.id}">Modifier</button><button class="button button-outline" data-toggle="${p.id}" data-active="${p.is_active}">${p.is_active ? "Masquer" : "Publier"}</button><button class="button button-outline" data-delete="${p.id}">Supprimer</button></div>
      </div>`).join("") : `<div class="empty-state">Aucun produit. Ajoutez votre premier bracelet ci-dessus.</div>`;
    list.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => editProduct(data.find(p => p.id === b.dataset.edit))));
    list.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", () => toggleProduct(b.dataset.toggle, b.dataset.active === "true")));
    list.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteProduct(b.dataset.delete)));
  }
  function editProduct(p) {
    $("editProductId").value = p.id; $("productName").value = p.name;
    $("productDescription").value = p.description || ""; $("productPrice").value = p.price;
    $("productStock").value = p.stock; $("productActive").checked = p.is_active;
    $("productEditorTitle").textContent = "Modifier le produit";
    $("saveProductButton").textContent = "Enregistrer les modifications";
    $("productForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function resetProductForm() {
    $("productForm").reset(); $("editProductId").value = "";
    $("productActive").checked = true; $("productStock").value = 0;
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
      const file = $("productImage").files[0];
      const imageUrl = await uploadImage(file);
      const record = {
        name: $("productName").value.trim(),
        description: $("productDescription").value.trim(),
        price: Number($("productPrice").value),
        stock: Number($("productStock").value),
        is_active: $("productActive").checked
      };
      if (!record.name || !Number.isFinite(record.price) || record.price < 0 || !Number.isInteger(record.stock) || record.stock < 0) throw new Error("Vérifiez le nom, le prix et le stock.");
      if (imageUrl) record.image_url = imageUrl;
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
  $("headerOrder").addEventListener("click", () => $("collection").scrollIntoView({ behavior: "smooth" }));
  $("contactWhatsApp").href = `https://wa.me/${cfg.WHATSAPP_NUMBER || "243818616951"}`;
  $("menuToggle").addEventListener("click", () => $("mainNav")?.classList.toggle("open"));
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeDialog(b.dataset.close)));
  ["orderDialog","adminDialog"].forEach(id => $(id).addEventListener("click", e => { if (e.target === $(id)) closeDialog(id); }));
  document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === tab));
    ["productsTab","ordersTab"].forEach(id => $(id).hidden = id !== tab.dataset.tab);
  }));
  $("year").textContent = new Date().getFullYear();
  // Nav mobile
  const nav = document.querySelector(".main-nav");
  $("menuToggle").addEventListener("click", () => nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));
  loadProducts();
})();
