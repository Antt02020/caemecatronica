const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const DB_PATH = path.join(__dirname, 'db.json');

// Helper to read database
function readDB() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            return { config: { public_key: "", private_key: "" }, users: [], orders: [] };
        }
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading database:", e);
        return { config: { public_key: "", private_key: "" }, users: [], orders: [] };
    }
}

// Helper to write database
function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error("Error writing database:", e);
    }
}


// SHA1 function
function sha1(str) {
    return crypto.createHash('sha1').update(str).digest('hex');
}

// Session secrets and signature helpers
// IMPORTANT: this secret is independent of db.config.private_key (que es la
// clave privada de Pagopar). Antes se reutilizaba ese mismo campo, por lo que
// cada vez que se guardaba la configuración de Pagopar se invalidaban todas
// las sesiones activas (de ahí el error "Tu sesión ha expirado o es inválida").
function getSessionSecret() {
    const db = readDB();
    if (!db.config.session_secret) {
        db.config.session_secret = crypto.randomBytes(32).toString('hex');
        writeDB(db);
    }
    return db.config.session_secret;
}

function hmacSha256(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        if (parts.length >= 2) {
            list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
        }
    });
    return list;
}

function createSessionToken(email, role) {
    const payload = JSON.stringify({
        email: email.toLowerCase(),
        role: role,
        expires: Date.now() + 86400000 * 7 // 7 days
    });
    const payloadBase64 = Buffer.from(payload).toString('base64');
    const signature = hmacSha256(payloadBase64, getSessionSecret());
    return `${payloadBase64}.${signature}`;
}

function verifySessionToken(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    
    const [payloadBase64, signature] = parts;
    const expectedSignature = hmacSha256(payloadBase64, getSessionSecret());
    if (signature !== expectedSignature) return null;
    
    try {
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
        if (payload.expires < Date.now()) return null;
        return payload;
    } catch (e) {
        return null;
    }
}

function setSessionCookie(res, email, role) {
    const token = createSessionToken(email, role);
    res.setHeader('Set-Cookie', `cae_session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=604800`);
}

function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', 'cae_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
}

function authenticate(req, res, next) {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies['cae_session'];
    const session = verifySessionToken(token);
    
    if (!session) {
        return res.status(401).json({ success: false, error: "No autenticado. Por favor inicia sesión." });
    }
    
    const db = readDB();
    const user = db.users.find(u => u.email.toLowerCase() === session.email);
    
    if (!user) {
        return res.status(401).json({ success: false, error: "Usuario no encontrado." });
    }
    
    if (user.status === "Bloqueado") {
        return res.status(403).json({ success: false, error: "Tu cuenta ha sido bloqueada. Contacta a soporte." });
    }
    
    req.user = user;
    next();
}

function requireAdmin(req, res, next) {
    authenticate(req, res, () => {
        if (req.user.role !== 'administrador') {
            return res.status(403).json({ success: false, error: "Acceso denegado. Se requieren permisos de administrador." });
        }
        next();
    });
}


// ==========================================================================
// CONFIGURATION ENDPOINTS
// ==========================================================================
app.get('/api/admin/config', requireAdmin, (req, res) => {
    const db = readDB();
    res.json({
        public_key: db.config.public_key || "",
        has_private_key: !!db.config.private_key,
        google_client_id: db.config.google_client_id || "",
        has_google_client_secret: !!db.config.google_client_secret,
        apple_client_id: db.config.apple_client_id || "",
        apple_redirect_uri: db.config.apple_redirect_uri || "",
        price_basic: db.config.price_basic !== undefined ? db.config.price_basic : 350000,
        price_profesional: db.config.price_profesional !== undefined ? db.config.price_profesional : 990000,
        price_premium: db.config.price_premium !== undefined ? db.config.price_premium : 1490000
    });
});

app.post('/api/admin/config', requireAdmin, (req, res) => {
    const { public_key, private_key, google_client_id, google_client_secret, apple_client_id, apple_redirect_uri, price_basic, price_profesional, price_premium } = req.body;
    const db = readDB();
    db.config.public_key = public_key || "";
    if (private_key) {
        db.config.private_key = private_key;
    }
    db.config.google_client_id = google_client_id || "";
    if (google_client_secret) {
        db.config.google_client_secret = google_client_secret;
    }
    db.config.apple_client_id = apple_client_id || "";
    db.config.apple_redirect_uri = apple_redirect_uri || "";
    
    if (price_basic !== undefined) db.config.price_basic = Number(price_basic);
    if (price_profesional !== undefined) db.config.price_profesional = Number(price_profesional);
    if (price_premium !== undefined) db.config.price_premium = Number(price_premium);
    
    writeDB(db);
    res.json({ success: true, message: "Configuración guardada exitosamente." });
});

app.get('/api/config', (req, res) => {
    const db = readDB();
    res.json({
        public_key: db.config.public_key || "",
        google_client_id: db.config.google_client_id || "",
        apple_client_id: db.config.apple_client_id || "",
        apple_redirect_uri: db.config.apple_redirect_uri || "",
        price_basic: db.config.price_basic !== undefined ? db.config.price_basic : 350000,
        price_profesional: db.config.price_profesional !== undefined ? db.config.price_profesional : 990000,
        price_premium: db.config.price_premium !== undefined ? db.config.price_premium : 1490000
    });
});

// ==========================================================================
// AUTHENTICATION ENDPOINTS
// ==========================================================================
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    
    // Check admin
    if (email === "admin@cae.com" && password === "admin123") {
        const adminUser = db.users.find(u => u.role === "administrador") || {
            email: "admin@cae.com",
            firstName: "Admin",
            lastName: "General",
            role: "administrador",
            career: "Ambas",
            plan: "Premium"
        };
        setSessionCookie(res, adminUser.email, adminUser.role);
        return res.json({ success: true, user: adminUser });
    }
    
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
        if (user.status === "Bloqueado") {
            return res.status(403).json({ success: false, message: "Tu cuenta ha sido bloqueada. Contacta a soporte." });
        }
        if (user.password === password) {
            setSessionCookie(res, user.email, user.role);
            return res.json({ success: true, user });
        }
    }
    res.status(401).json({ success: false, message: "Credenciales incorrectas o usuario no registrado." });
});

app.post('/api/auth/register', (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const db = readDB();
    
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ success: false, message: "El correo ya está registrado en la plataforma." });
    }
    
    const newUser = {
        email,
        password,
        firstName,
        lastName,
        career: "Ninguna",
        plan: "None",
        purchasedModules: [],
        purchasedCareers: [],
        status: "Activo",
        role: "alumno"
    };
    
    db.users.push(newUser);
    writeDB(db);
    setSessionCookie(res, newUser.email, newUser.role);
    res.json({ success: true, user: newUser });
});

app.get('/api/me', authenticate, (req, res) => {
    res.json({ success: true, user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ success: true, message: "Sesión cerrada correctamente." });
});

app.get('/api/user/profile', authenticate, (req, res) => {
    const email = req.query.email || req.user.email;
    if (email.toLowerCase() !== req.user.email.toLowerCase() && req.user.role !== 'administrador') {
        return res.status(403).json({ success: false, error: "Acceso denegado." });
    }
    
    const db = readDB();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
        res.json({ success: true, user });
    } else {
        res.status(404).json({ success: false, error: "User not found" });
    }
});

// ==========================================================================
// CHECKOUT & WEBHOOK
// ==========================================================================
app.post('/api/checkout', authenticate, (req, res) => {
    const { plan, career, modules, comprador } = req.body;
    const user = req.user;
    const email = user.email;
    const db = readDB();
    
    // Calculate pricing in Guaraníes (PYG) using configurable prices
    const priceBasic = db.config.price_basic !== undefined ? db.config.price_basic : 350000;
    const priceProfesional = db.config.price_profesional !== undefined ? db.config.price_profesional : 990000;
    const pricePremium = db.config.price_premium !== undefined ? db.config.price_premium : 1490000;
    
    let monto_total = 0;
    let desc_resumen = "";
    if (plan === "Premium") {
        monto_total = pricePremium;
        desc_resumen = "Acceso Total CAE (Plan Premium)";
    } else if (plan === "Profesional") {
        monto_total = priceProfesional;
        desc_resumen = `Entrenamiento Completo de ${career} (Plan Profesional)`;
    } else if (plan === "Básico") {
        monto_total = priceBasic * (modules ? modules.length : 1);
        desc_resumen = `Módulos de ${career}: ${modules ? modules.join(", ") : ""}`;
    }
    
    // Generate order ID
    const id_pedido_comercio = "CAE-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 10);
    
    // Check if configuration exists
    const pubKey = db.config.public_key;
    const privKey = db.config.private_key;
    
    if (!pubKey || !privKey) {
        console.warn(`[CHECKOUT] Pagopar credentials not configured. Rejecting request.`);
        return res.status(400).json({
            success: false,
            error: "Falta configurar las credenciales de Pagopar en el Panel de Control Administrativo."
        });
    }
    
    const token = sha1(privKey + id_pedido_comercio + String(monto_total));
    
    // Register order in database with V3 structure
    const newOrder = {
        id: id_pedido_comercio,
        id_pedido_comercio,
        userId: email,
        email,
        type: plan.toLowerCase(),
        plan,
        career,
        modules: modules || [],
        amount: monto_total,
        monto_total,
        status: "pending",
        estado: "Pendiente",
        hashPedido: "",
        hash_pedido: "",
        createdAt: new Date().toISOString(),
        comprador
    };
    
    if (!db.orders) db.orders = [];
    db.orders.push(newOrder);
    writeDB(db);
    
    // Real integration payload (according to PDF documentation)
    const payload = {
        token: token,
        comprador: {
            ruc: comprador.ruc || "",
            email: email,
            ciudad: "1",
            nombre: `${user.firstName} ${user.lastName}`,
            telefono: comprador.telefono || "",
            direccion: "",
            documento: comprador.documento || "",
            coordenadas: "",
            razon_social: `${user.firstName} ${user.lastName}`,
            tipo_documento: "CI",
            direccion_referencia: null
        },
        public_key: pubKey,
        monto_total: monto_total,
        tipo_pedido: "VENTA-COMERCIO",
        compras_items: [
            {
                ciudad: "1",
                nombre: desc_resumen,
                cantidad: 1,
                categoria: "909",
                public_key: pubKey,
                url_imagen: "",
                descripcion: desc_resumen,
                id_producto: 1,
                precio_total: monto_total,
                vendedor_telefono: "",
                vendedor_direccion: "",
                vendedor_direccion_referencia: "",
                vendedor_direccion_coordenadas: ""
            }
        ],
        fecha_maxima_pago: new Date(Date.now() + 86400000 * 2).toISOString().replace('T', ' ').slice(0, 19), // 2 days max
        id_pedido_comercio: id_pedido_comercio,
        descripcion_resumen: desc_resumen,
        forma_pago: 9 // Credit Card standard
    };
    
    // Call Pagopar API (POST)
    const options = {
        hostname: 'api.pagopar.com',
        path: '/api/comercios/2.0/iniciar-transaccion',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const request = https.request(options, (response) => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
            try {
                const result = JSON.parse(body);
                if (result.respuesta && result.resultado && result.resultado[0]) {
                    const hashPedido = result.resultado[0].data;
                    console.log(`[CHECKOUT] Real Pagopar request success. Hash: ${hashPedido}`);
                    
                    // Update order with hash
                    const ord = db.orders.find(o => o.id === id_pedido_comercio);
                    if (ord) {
                        ord.hashPedido = hashPedido;
                        ord.hash_pedido = hashPedido;
                        writeDB(db);
                    }
                    
                    res.json({
                        success: true,
                        mode: "real",
                        redirectUrl: `https://www.pagopar.com/pagos/${hashPedido}`
                    });
                } else {
                    console.error("[CHECKOUT] Pagopar API returned error. Status:", response.statusCode, "Body:", body);
                    res.status(500).json({ error: "Error de la API de Pagopar: " + (result.resultado || "Respuesta inválida") });
                }
            } catch (e) {
                console.error("[CHECKOUT] JSON parse error on Pagopar response. Status:", response.statusCode, "Headers:", JSON.stringify(response.headers), "Raw body:", body);
                res.status(500).json({
                    error: "Respuesta de pasarela corrupta o inválida",
                    debug_status: response.statusCode,
                    debug_body: (body || "").slice(0, 500)
                });
            }
        });
    });
    
    request.on('error', (err) => {
        console.error("[CHECKOUT] Connection error to Pagopar API:", err.code, err.message, err);
        res.status(500).json({ error: "Error de comunicación con la pasarela de pagos", debug_code: err.code, debug_message: err.message });
    });
    
    request.write(JSON.stringify(payload));
    request.end();
});

// Pagopar Callback Webhook (IPN)
app.post('/api/pagopar-webhook', (req, res) => {
    const payload = req.body;
    
    if (!payload || !payload.resultado || !payload.resultado[0]) {
        return res.status(400).json({ respuesta: false, resultado: "Payload inválido" });
    }
    
    const transaction = payload.resultado[0];
    const hash_pedido = transaction.hash_pedido;
    const incoming_token = transaction.token;
    
    const db = readDB();
    const privKey = db.config.private_key;
    
    // Formula check: sha1(private_key + hash_pedido)
    const expected_token = sha1(privKey + hash_pedido);
    
    if (incoming_token !== expected_token) {
        console.warn(`[WEBHOOK] Token mismatch: expected ${expected_token}, got ${incoming_token}`);
        return res.status(400).json({ respuesta: false, resultado: "Token no coincide." });
    }
    
    // Find order
    const targetOrder = db.orders.find(o => o.id === transaction.numero_pedido || o.hashPedido === hash_pedido || o.id_pedido_comercio === transaction.numero_pedido);
    
    if (!targetOrder) {
        console.warn(`[WEBHOOK] Order not found for webhook notification.`);
        return res.status(404).json({ respuesta: false, resultado: "Pedido no encontrado en base de datos local." });
    }
    
    // Mark order as paid
    targetOrder.status = transaction.pagado ? "paid" : "canceled";
    targetOrder.estado = transaction.pagado ? "Completado" : "Reversado";
    targetOrder.hashPedido = hash_pedido;
    targetOrder.hash_pedido = hash_pedido;
    
    if (transaction.pagado) {
        // Update user permissions
        const user = db.users.find(u => u.email.toLowerCase() === targetOrder.email.toLowerCase());
        if (user) {
            user.plan = targetOrder.plan;
            
            if (targetOrder.plan === "Premium") {
                user.purchasedCareers = ["electronica", "mecatronica"];
                user.career = "Ambas";
            } else if (targetOrder.plan === "Profesional") {
                if (!user.purchasedCareers.includes(targetOrder.career.toLowerCase())) {
                    user.purchasedCareers.push(targetOrder.career.toLowerCase());
                }
                user.career = targetOrder.career;
            } else if (targetOrder.plan === "Básico") {
                if (!user.purchasedModules) user.purchasedModules = [];
                targetOrder.modules.forEach(mId => {
                    if (!user.purchasedModules.includes(mId)) {
                        user.purchasedModules.push(mId);
                    }
                });
                user.career = targetOrder.career;
            }
        }
        
        // Add transaction entry
        if (!db.transactions) db.transactions = [];
        const txExists = db.transactions.some(t => t.orderId === targetOrder.id);
        if (!txExists) {
            const newTransaction = {
                transactionId: transaction.numero_comprobante_interno || ("TX-" + Date.now()),
                orderId: targetOrder.id,
                userId: targetOrder.userId,
                amount: targetOrder.amount,
                plan: targetOrder.plan,
                career: targetOrder.career,
                status: "paid",
                paidAt: new Date().toISOString()
            };
            db.transactions.push(newTransaction);
        }
    }
    
    writeDB(db);
    console.log(`[WEBHOOK] Webhook processed successfully for order ${targetOrder.id}. Status: ${targetOrder.status}`);
    
    res.json(payload);
});

// Sincronización POST /api/payment-status
app.post('/api/payment-status', authenticate, (req, res) => {
    const { hash_pedido } = req.body;
    if (!hash_pedido) {
        return res.status(400).json({ error: "Falta hash_pedido" });
    }
    
    const db = readDB();
    const pubKey = db.config.public_key;
    const privKey = db.config.private_key;
    
    if (!pubKey || !privKey) {
        return res.status(400).json({ error: "Falta configurar credenciales de Pagopar." });
    }
    
    const token = sha1(privKey + "CONSULTA");
    
    const payload = {
        hash_pedido: hash_pedido,
        token: token,
        token_publico: pubKey
    };
    
    const options = {
        hostname: 'api.pagopar.com',
        path: '/api/pedidos/1.1/traer',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const request = https.request(options, (response) => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
            try {
                const result = JSON.parse(body);
                if (result.respuesta && result.resultado && result.resultado[0]) {
                    const tx = result.resultado[0];
                    
                    if (tx.pagado) {
                        const localOrder = db.orders.find(o => o.id === tx.numero_pedido || o.hashPedido === hash_pedido);
                        if (localOrder && localOrder.email.toLowerCase() !== req.user.email.toLowerCase() && req.user.role !== 'administrador') {
                            return res.status(403).json({ error: "No tienes permiso para consultar este pedido." });
                        }
                        if (localOrder && localOrder.estado !== "Completado") {
                            localOrder.estado = "Completado";
                            localOrder.status = "paid";
                            localOrder.hash_pedido = hash_pedido;
                            localOrder.hashPedido = hash_pedido;
                            
                            const user = db.users.find(u => u.email.toLowerCase() === localOrder.email.toLowerCase());
                            if (user) {
                                user.plan = localOrder.plan;
                                if (localOrder.plan === "Premium") {
                                    user.purchasedCareers = ["electronica", "mecatronica"];
                                    user.career = "Ambas";
                                } else if (localOrder.plan === "Profesional") {
                                    if (!user.purchasedCareers.includes(localOrder.career.toLowerCase())) {
                                        user.purchasedCareers.push(localOrder.career.toLowerCase());
                                    }
                                    user.career = localOrder.career;
                                } else if (localOrder.plan === "Básico") {
                                    if (!user.purchasedModules) user.purchasedModules = [];
                                    localOrder.modules.forEach(mId => {
                                        if (!user.purchasedModules.includes(mId)) {
                                            user.purchasedModules.push(mId);
                                        }
                                    });
                                    user.career = localOrder.career;
                                }
                            }
                            
                            if (!db.transactions) db.transactions = [];
                            const txExists = db.transactions.some(t => t.orderId === localOrder.id);
                            if (!txExists) {
                                const newTransaction = {
                                    transactionId: tx.numero_comprobante_interno || ("TX-" + Date.now()),
                                    orderId: localOrder.id,
                                    userId: localOrder.userId,
                                    amount: localOrder.amount,
                                    plan: localOrder.plan,
                                    career: localOrder.career,
                                    status: "paid",
                                    paidAt: new Date().toISOString()
                                };
                                db.transactions.push(newTransaction);
                            }
                            writeDB(db);
                        }
                    }
                    res.json({ success: true, resultado: result.resultado });
                } else {
                    res.status(400).json({ success: false, error: result.resultado || "Error al consultar estado" });
                }
            } catch (e) {
                res.status(500).json({ error: "Respuesta inválida de Pagopar" });
            }
        });
    });
    
    request.on('error', (err) => {
        res.status(500).json({ error: "Error de conexión con Pagopar" });
    });
    
    request.write(JSON.stringify(payload));
    request.end();
});

// Admin panel dashboard stats endpoint
app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const db = readDB();
    const txList = db.transactions || [];
    const students = db.users.filter(u => u.role === "alumno");
    
    const totalSales = txList.reduce((sum, t) => sum + Number(t.amount), 0);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlySales = txList
        .filter(t => new Date(t.paidAt) >= thirtyDaysAgo)
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
    const threeSixtyFiveDaysAgo = new Date();
    threeSixtyFiveDaysAgo.setDate(threeSixtyFiveDaysAgo.getDate() - 365);
    const annualSales = txList
        .filter(t => new Date(t.paidAt) >= threeSixtyFiveDaysAgo)
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
    const ticketPromedio = txList.length > 0 ? (totalSales / txList.length) : 0;
    const mrr = monthlySales;
    const arr = mrr * 12;
    
    // Group monthly summaries
    const monthlySummary = {};
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    txList.forEach(t => {
        const date = new Date(t.paidAt);
        const monthName = monthNames[date.getMonth()];
        monthlySummary[monthName] = (monthlySummary[monthName] || 0) + Number(t.amount);
    });
    
    // Career distribution counts
    const careerCounts = { electronica: 0, mecatronica: 0 };
    students.forEach(s => {
        const c = s.career ? s.career.toLowerCase() : "";
        if (c.includes("electronica") || c.includes("electrónica")) careerCounts.electronica++;
        if (c.includes("mecatronica") || c.includes("mecatrónica")) careerCounts.mecatronica++;
        if (c === "ambas") {
            careerCounts.electronica++;
            careerCounts.mecatronica++;
        }
    });
    const totalStudents = students.length;
    
    // Conversions by plan count
    const planCounts = { Básico: 0, Profesional: 0, Premium: 0 };
    students.forEach(s => {
        if (s.plan === "Básico") planCounts.Básico++;
        if (s.plan === "Profesional") planCounts.Profesional++;
        if (s.plan === "Premium") planCounts.Premium++;
    });
    
    // Revenues by plan
    const planRevenues = { Básico: 0, Profesional: 0, Premium: 0 };
    txList.forEach(t => {
        if (t.plan === "Básico") planRevenues.Básico += Number(t.amount);
        if (t.plan === "Profesional") planRevenues.Profesional += Number(t.amount);
        if (t.plan === "Premium") planRevenues.Premium += Number(t.amount);
    });
    
    res.json({
        success: true,
        totalStudents,
        totalSales,
        monthlySales,
        annualSales,
        ticketPromedio,
        mrr,
        arr,
        monthlySummary,
        careerCounts,
        planCounts,
        planRevenues,
        orders: db.orders || [],
        transactions: txList
    });
});

// Google OAuth callback page
app.get('/auth/google/callback', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth-google-callback.html'));
});

// Google Sign-In verification endpoint using PKCE
app.post('/api/auth/google-login', (req, res) => {
    const { code, code_verifier } = req.body;
    if (!code || !code_verifier) {
        return res.status(400).json({ error: "Faltan code o code_verifier" });
    }
    
    const db = readDB();
    const googleClientId = db.config.google_client_id;
    const googleClientSecret = db.config.google_client_secret || "";
    
    const postData = new URLSearchParams({
        code: code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code_verifier: code_verifier,
        grant_type: 'authorization_code',
        redirect_uri: `${req.headers.origin || 'http://localhost:3000'}/auth/google/callback`
    }).toString();
    
    const tokenOptions = {
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const tokenReq = https.request(tokenOptions, (tokenRes) => {
        let tokenBody = '';
        tokenRes.on('data', chunk => tokenBody += chunk);
        tokenRes.on('end', () => {
            try {
                const tokenData = JSON.parse(tokenBody);
                if (tokenData.error) {
                    console.error("[GOOGLE LOGIN] Token exchange error:", tokenData);
                    return res.status(400).json({ success: false, message: "Error al intercambiar código: " + (tokenData.error_description || tokenData.error) });
                }
                
                const accessToken = tokenData.access_token;
                
                const userinfoOptions = {
                    hostname: 'www.googleapis.com',
                    path: `/oauth2/v3/userinfo?access_token=${accessToken}`,
                    method: 'GET'
                };
                
                const userinfoReq = https.request(userinfoOptions, (userinfoRes) => {
                    let userinfoBody = '';
                    userinfoRes.on('data', chunk => userinfoBody += chunk);
                    userinfoRes.on('end', () => {
                        try {
                            const googleUser = JSON.parse(userinfoBody);
                            if (googleUser.email) {
                                const db = readDB();
                                let user = db.users.find(u => u.email.toLowerCase() === googleUser.email.toLowerCase());
                                
                                if (!user) {
                                    user = {
                                        email: googleUser.email,
                                        firstName: googleUser.given_name || "Usuario",
                                        lastName: googleUser.family_name || "Google",
                                        career: "Ninguna",
                                        plan: "None",
                                        purchasedModules: [],
                                        purchasedCareers: [],
                                        status: "Activo",
                                        role: "alumno"
                                    };
                                    db.users.push(user);
                                    writeDB(db);
                                }
                                
                                if (user.status === "Bloqueado") {
                                    return res.status(403).json({ success: false, message: "Tu cuenta ha sido bloqueada." });
                                }
                                
                                setSessionCookie(res, user.email, user.role);
                                res.json({ success: true, user });
                            } else {
                                res.status(400).json({ success: false, message: "No se pudo obtener el email de Google." });
                            }
                        } catch (e) {
                            res.status(500).json({ error: "Error al verificar perfil de Google" });
                        }
                    });
                });
                
                userinfoReq.on('error', (err) => {
                    res.status(500).json({ error: "Error al consultar perfil en Google" });
                });
                
                userinfoReq.end();
            } catch (e) {
                res.status(500).json({ error: "Error al procesar tokens de Google" });
            }
        });
    });
    
    tokenReq.on('error', (err) => {
        console.error("[GOOGLE LOGIN] Connection error during code exchange:", err);
        res.status(500).json({ error: "Error de comunicación con Google" });
    });
    
    tokenReq.write(postData);
    tokenReq.end();
});

// Apple Sign-In callback handler (Form Post)
app.post('/api/auth/apple/callback', (req, res) => {
    const { id_token } = req.body;
    if (!id_token) {
        return res.status(400).send("Falta id_token de Apple");
    }
    
    try {
        const parts = id_token.split('.');
        if (parts.length !== 3) throw new Error("JWT corrupto");
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        const email = payload.email;
        
        if (!email) {
            return res.status(400).send("No se pudo obtener el email del token de Apple");
        }
        
        const db = readDB();
        let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
            user = {
                email: email,
                firstName: "Usuario",
                lastName: "Apple",
                career: "Ninguna",
                plan: "None",
                purchasedModules: [],
                purchasedCareers: [],
                status: "Activo",
                role: "alumno"
            };
            db.users.push(user);
            writeDB(db);
        }
        
        if (user.status === "Bloqueado") {
            return res.status(403).send("Tu cuenta ha sido bloqueada. Contacta a soporte.");
        }
        
        setSessionCookie(res, user.email, user.role);
        res.send(`
            <script>
                localStorage.setItem('cae_user', JSON.stringify(${JSON.stringify(user)}));
                window.location.href = '${user.role === "administrador" ? "/admin.html" : "/dashboard.html"}';
            </script>
        `);
    } catch (e) {
        res.status(500).send("Error de decodificación de Apple ID Token: " + e.message);
    }
});

// Default status catch
app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api/')) {
        res.status(404).json({ error: "Not Found" });
    } else {
        next();
    }
});

app.listen(PORT, () => {
    console.log(`[SERVER] CAE Mecatrónica server running on http://localhost:${PORT}`);
});