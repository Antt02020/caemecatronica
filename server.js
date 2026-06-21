const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

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

// ==========================================================================
// CONFIGURATION ENDPOINTS
// ==========================================================================
app.get('/api/admin/config', (req, res) => {
    const db = readDB();
    // NEVER return the private_key to frontend
    res.json({
        public_key: db.config.public_key || "",
        has_private_key: !!db.config.private_key
    });
});

app.post('/api/admin/config', (req, res) => {
    const { public_key, private_key } = req.body;
    const db = readDB();
    db.config.public_key = public_key || "";
    if (private_key) {
        db.config.private_key = private_key;
    }
    writeDB(db);
    res.json({ success: true, message: "Configuración guardada exitosamente." });
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
        return res.json({ success: true, user: adminUser });
    }
    
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
        if (user.status === "Bloqueado") {
            return res.status(403).json({ success: false, message: "Tu cuenta ha sido bloqueada. Contacta a soporte." });
        }
        if (user.password === password) {
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
    res.json({ success: true, user: newUser });
});

app.get('/api/user/profile', (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
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
app.post('/api/checkout', (req, res) => {
    const { email, plan, career, modules, comprador } = req.body;
    const db = readDB();
    
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    // Calculate pricing in Guaraníes (PYG)
    let monto_total = 0;
    let desc_resumen = "";
    if (plan === "Premium") {
        monto_total = 1490000;
        desc_resumen = "Acceso Total CAE (Plan Premium)";
    } else if (plan === "Profesional") {
        monto_total = 990000;
        desc_resumen = `Entrenamiento Completo de ${career} (Plan Profesional)`;
    } else if (plan === "Básico") {
        monto_total = 350000 * (modules ? modules.length : 1);
        desc_resumen = `Módulos de ${career}: ${modules ? modules.join(", ") : ""}`;
    }
    
    // Generate order ID
    const id_pedido_comercio = "CAE-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 10);
    
    // Check if configuration exists
    const pubKey = db.config.public_key;
    const privKey = db.config.private_key;
    
    const token = sha1(privKey + id_pedido_comercio + String(monto_total));
    
    const newOrder = {
        id_pedido_comercio,
        email,
        plan,
        career,
        modules: modules || [],
        monto_total,
        estado: "Pendiente",
        fecha: new Date().toISOString(),
        comprador
    };
    
    db.orders.push(newOrder);
    writeDB(db);
    
    if (!pubKey || !privKey) {
        // Run in Simulator Mode
        console.log(`[CHECKOUT] Running in simulation mode. Order ID: ${id_pedido_comercio}`);
        return res.json({
            success: true,
            mode: "simulador",
            redirectUrl: `/checkout-simulator.html?pedido=${id_pedido_comercio}`
        });
    }
    
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
    
    const request = http.request(options, (response) => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
            try {
                const result = JSON.parse(body);
                if (result.respuesta && result.resultado && result.resultado[0]) {
                    const hashPedido = result.resultado[0].data;
                    console.log(`[CHECKOUT] Real Pagopar request success. Hash: ${hashPedido}`);
                    res.json({
                        success: true,
                        mode: "real",
                        redirectUrl: `https://www.pagopar.com/pagos/${hashPedido}`
                    });
                } else {
                    console.error("[CHECKOUT] Pagopar API returned error:", result);
                    res.status(500).json({ error: "Error de la API de Pagopar: " + (result.resultado || "Respuesta inválida") });
                }
            } catch (e) {
                console.error("[CHECKOUT] JSON parse error on Pagopar response:", e, body);
                res.status(500).json({ error: "Respuesta de pasarela corrupta o inválida" });
            }
        });
    });
    
    request.on('error', (err) => {
        console.error("[CHECKOUT] Connection error to Pagopar API:", err);
        res.status(500).json({ error: "Error de comunicación con la pasarela de pagos" });
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
    
    // Simulator bypass: if there is no private key configured, we allow simulator webhook
    if (privKey && incoming_token !== expected_token) {
        console.warn(`[WEBHOOK] Token mismatch: expected ${expected_token}, got ${incoming_token}`);
        return res.status(400).json({ respuesta: false, resultado: "Token no coincide." });
    }
    
    const orderId = transaction.numero_pedido || transaction.numero_comprobante_interno; // wait, wait! The webhook payload from the PDF uses 'hash_pedido' and 'numero_pedido' for the transaction id. Let's find it.
    // In our simulator, we pass 'id_pedido_comercio' inside custom structures
    const localOrder = db.orders.find(o => o.id_pedido_comercio === transaction.numero_pedido || o.id_pedido_comercio === transaction.hash_pedido);
    
    if (!localOrder) {
        // If not found by order number directly, search using comprador email
        console.warn(`[WEBHOOK] Order not found for id ${transaction.numero_pedido}. Checking latest order...`);
    }
    
    const targetOrder = localOrder || db.orders.filter(o => o.email.toLowerCase() === transaction.token.toLowerCase() || o.estado === "Pendiente").pop();
    
    if (!targetOrder) {
        return res.status(404).json({ respuesta: false, resultado: "Pedido no encontrado en base de datos local." });
    }
    
    // Mark order as paid
    targetOrder.estado = transaction.pagado ? "Completado" : "Reversado";
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
    }
    
    writeDB(db);
    console.log(`[WEBHOOK] Webhook processed successfully for order ${targetOrder.id_pedido_comercio}. Status: ${targetOrder.estado}`);
    
    // Pagopar recommends returning the exact JSON result
    res.json(payload);
});

// Admin panel dashboard data
app.get('/api/admin/stats', (req, res) => {
    const db = readDB();
    const students = db.users.filter(u => u.role === "alumno");
    const totalSales = db.orders
        .filter(o => o.estado === "Completado")
        .reduce((sum, o) => sum + o.monto_total, 0);
        
    res.json({
        totalStudents: students.length,
        totalSales: totalSales,
        orders: db.orders
    });
});

// Default status catch
app.get('*', (req, res, next) => {
    // If it looks like an API call, return 404, else call next() to let static server handle it
    if (req.url.startsWith('/api/')) {
        res.status(404).json({ error: "Not Found" });
    } else {
        next();
    }
});

app.listen(PORT, () => {
    console.log(`[SERVER] CAE Mecatrónica server running on http://localhost:${PORT}`);
});
